import axios from "axios";
import https from "https";
import http from "http";

// Agente HTTP/HTTPS con keep-alive para reutilizar conexiones TCP entre microservicios.
// Sin esto, cada llamada inter-MS crea una nueva conexión TCP+TLS (~200-300ms overhead).
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

export const internalHttpClient = axios.create({
  httpsAgent,
  httpAgent,
  timeout: 10000,
});
