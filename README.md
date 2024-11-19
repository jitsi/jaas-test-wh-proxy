# jaas-test-wh-proxy
Webhooks proxy used for testing Jitsi as a Service (JaaS).

* Listens for JaaS webhooks
* Listens for WS connections
    * Authenticated with a shared secret
    * Bound for a specific room using URL params: tenant= and room=
* Proxies JaaS webhooks through the WS connection for the room (if any)

Used, for example, in jitsi-meet tests:
https://github.com/jitsi/jitsi-meet/blob/master/tests/helpers/WebhookProxy.ts
