# jaas-test-wh-proxy
Webhooks proxy used for testing Jitsi as a Service (JaaS).

* Listens for JaaS webhooks
* Listens for WS connections
    * Authenticated with a shared secret
    * Bound for a specific room using URL params: tenant= and room=
* Proxies JaaS webhooks through the WS connection for the room (if any)

Used, for example, in jitsi-meet tests:
https://github.com/jitsi/jitsi-meet/blob/master/tests/helpers/WebhookProxy.ts

# Running
You can run the application with
```
SHARED_SECRET=abc node index.js
```

You can change the ports used by defining `PORT` (default 18080) and 
`PRIVATE_PORT` (used for health checks and metrics, default 18081).

# Docker
To run with docker just set the `SHARED_SECRET` env variable, e.g. to run the
latest image from dockerhub:
```
docker run -e SHARED_SECRET=abc -p 3000:80 jitsi/jaas-test-wh-proxy:latest
```
