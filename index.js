import { WebSocketServer } from 'ws'
import express from 'express';
import queryString from 'query-string';
import 'dotenv/config';
import * as promClient from 'prom-client';
const app = express();

// Used for health and metrics checks
const privateApp = express();

const port = process.env.PORT || 18080;
const privatePort = process.env.PRIVATE_PORT || 18081;
const sharedSecret = process.env.SHARED_SECRET;
const waitingClients = new Map();

if (!sharedSecret) {
    console.log('SHARED_SECRET must be defined.');
    process.exit(1)
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

promClient.collectDefaultMetrics();
const badCredentialsTotalCounter = new promClient.Counter({
    name: 'http_server_unauthorized_total',
    help: 'Counter for total unauthorized responses',
    labelNames: ['method'],
});
const whRequestsTotalCounter = new promClient.Counter({
    name: 'http_server_wh_total',
    help: 'Counter for total webhook requests'
});
const wsClientsTotalCounter = new promClient.Counter({
    name: 'http_server_ws_clients_total',
    help: 'Counter for total websocket clients'
});

/**
 * Middleware to check if the request has the correct shared secret.
 */
app.use((req, res, next) => {
    const providedSecret = req.headers.authorization || req.query.secret;

    if (!providedSecret || providedSecret !== process.env.SHARED_SECRET) {
        badCredentialsTotalCounter.inc({ method: req.method });
        return res.status(403).json({ error: 'bad credentials' });
    }
    next();
});

/**
 * Forwards any web hook message to the waiting client.
 */
app.post('/wh', function(req, res) {
    const ws = waitingClients.get(req.body.fqn);
    if (ws) {
        whRequestsTotalCounter.inc();
        ws.send(JSON.stringify(req.body))
    }

    return res.sendStatus(200);
});

/**
 * Forwards any settings provisioning message to the waiting client and waits for a response
 * which to send to the original client.
 */
app.post('/wh/settings', async function(req, res) {
    const ws = waitingClients.get(req.body.fqn);
    if (ws) {
        const promise = new Promise((resolve) => {
            const handler = (message) => {
                const parsedMessage = JSON.parse(message);

                resolve(parsedMessage);
            };

            ws.on('message', message => {
                ws.off('message', handler);
                handler(message);
            });
        });

        ws.send(JSON.stringify({
            ...req.body,
            eventType: 'SETTINGS_PROVISIONING',
        }));

        return res.json(await promise);
    } else {
        res.json({});
    }
});

privateApp.get('/health', (req, res) => {
    res.send('healthy!');
});
privateApp.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    } catch (err) {
        res.status(500).end(err.toString());
    }});

privateApp.listen(privatePort, () => {
    console.log(`Listening on private port ${privatePort}`)
});

const expressServer = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const websocketServer = new WebSocketServer({
    noServer: true,
    path: '/ws',
});

/**
 * Handle the upgrade of the HTTP request to a WebSocket connection.
 * A shared secret is required to establish the connection.
 */
expressServer.on('upgrade', (request, socket, head) => {
    let providedSecret = request.headers.authorization;

    if (!providedSecret) {
        const [_path, params] = request?.url?.split('?');
        const connectionParams = queryString.parse(params);

        providedSecret = connectionParams.secret;
    }

    if (!providedSecret || providedSecret !== process.env.SHARED_SECRET) {
        badCredentialsTotalCounter.inc({ method: 'ws' });
        socket.destroy();
        return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit('connection', websocket, request);
    });
});

/**
 * Handle the WebSocket connection and store the client websocket in a map.
 */
websocketServer.on(
    'connection',
    function connection(websocketConnection, connectionRequest) {
        const [_path, params] = connectionRequest?.url?.split('?');
        const connectionParams = queryString.parse(params);

        if (connectionParams.tenant && connectionParams.room) {
            const fqn = `${connectionParams.tenant}/${connectionParams.room}`;
            console.log(`Add client for ${fqn}`);
            wsClientsTotalCounter.inc();
            waitingClients.set(fqn, websocketConnection);

            websocketConnection.on('close', (reasonCode, description) => {
                waitingClients.delete(fqn);
                console.log(`Cleared a client for ${fqn}`);
            });
            websocketConnection.on('error', (error) => {
                waitingClients.delete(fqn);
                console.log(`Cleared a client for ${fqn} on error`, error);
            });
        }
    }
);
