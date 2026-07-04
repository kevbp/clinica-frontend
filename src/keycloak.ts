import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:9090',
  realm: 'clinica-interno',
  clientId: 'clinica-app',
});

export default keycloak;
