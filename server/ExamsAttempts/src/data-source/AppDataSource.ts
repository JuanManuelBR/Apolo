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
  synchronize: false,
  logging: false,
  entities: [ExamAttempt, ExamAnswer, ExamEvent, ExamInProgress],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
});
