# jaas-test-wh-proxy
Webhooks proxy used for testing jaas

# Deploy a new version
Build new version via https://jenkins-ops.jitsi.net/job/build-jaas-test-wh-proxy/
Get the build tag from the output of ^ 
infra-customizations-private % APP_VERSION=d7e77f878e ENVIRONMENT=stage-8x8 ORACLE_REGION=us-phoenix-1 ./scripts/deploy-nomad-jaas-test-wh-proxy.sh
