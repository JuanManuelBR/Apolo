import axios from "axios";
import https from "https";
import http from "http";

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });

export const internalHttpClient = axios.create({
  httpsAgent,
  httpAgent,
  timeout: 10000,
});

internalHttpClient.interceptors.request.use((config) => {
  config.headers["x-service-token"] = process.env.SERVICE_SECRET || "";
  return config;
});