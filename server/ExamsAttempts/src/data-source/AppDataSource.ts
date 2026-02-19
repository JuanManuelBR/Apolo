import { DataSource } from "typeorm";
import "reflect-metadata";

// importar datos del .env
import {
  DB_HOST,
  DB_NAME,
  DB_PASS,
  DB_PORT,
  DB_USER,
} from "../../config/config";
import { ExamAttempt } from "@src/models/ExamAttempt";
import { ExamAnswer } from "@src/models/ExamAnswer";
import { ExamInProgress } from "@src/models/ExamInProgress";
import { ExamEvent } from "@src/models/ExamEvent";
export const AppDataSource = new DataSource({
  type: "mysql",
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASS,
  port: DB_PORT,
  username: DB_USER,
  synchronize: true,
  logging: false,
  entities: [ExamAttempt, ExamAnswer, ExamEvent, ExamInProgress],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  connectTimeout: 30000,
  extra: {
    // Mantiene las conexiones del pool vivas para evitar ECONNRESET en TiDB Cloud
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectionLimit: 10,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0,
  },
});
