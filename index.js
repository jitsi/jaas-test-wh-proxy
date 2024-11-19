import { WebSocketServer } from 'ws'
import express from "express";
import queryString from "query-string";
import 'dotenv/config'
const app = express();

const port = process.env.PORT || 18080;
const waitingClients = new Map();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Middleware to check if the request has the correct shared secret.
 */
app.use((req, res, next) => {
    if (!req.headers.authorization || req.headers.authorization !== process.env.SHARED_SECRET) {
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

                resolve(res.json(parsedMessage));
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

        return await promise;
    }
});


const expressServer = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

const websocketServer = new WebSocketServer({
    noServer: true,
    path: "/ws",
});

/**
 * Handle the upgrade of the HTTP request to a WebSocket connection.
 * A shared secret is required to establish the connection.
 */
expressServer.on("upgrade", (request, socket, head) => {
    if (!request.headers.authorization || request.headers.authorization !== process.env.SHARED_SECRET) {
        socket.destroy();
        return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
        websocketServer.emit("connection", websocket, request);
    });
});

/**
 * Handle the WebSocket connection and store the client websocket in a map.
 */
websocketServer.on(
    "connection",
    function connection(websocketConnection, connectionRequest) {
        const [_path, params] = connectionRequest?.url?.split("?");
        const connectionParams = queryString.parse(params);

        if (connectionParams.tenant && connectionParams.room) {
            const fqn = `${connectionParams.tenant}/${connectionParams.room}`;
            console.log(`Add client for ${fqn}`);
            waitingClients.set(fqn, websocketConnection);

            websocketConnection.on("close", (reasonCode, description) => {
                waitingClients.delete(fqn);
                console.log(`Cleared a client for ${fqn}`);
            });
        }
    }
);
