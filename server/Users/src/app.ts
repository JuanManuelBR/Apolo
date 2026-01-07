import express from "express";
import { AppDataSource } from "./data-source/AppDataSource";
import cors from "cors";

import UserRoutes from "./routes/UserRoutes";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";

// Llamar express
const app = express();
// URLS permitidas para hacer peticiones al backend.
const whitelist = [
  process.env.FRONTEND_URL,
];

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin) return callback(null, true);

    const isAllowed = whitelist.some((allowed) => {
      if (typeof allowed === "string") {
        return allowed === origin;
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn("Intento de acceso desde origen no permitido:", origin);
      callback(new Error("CORS bloqueado: Origen no permitido"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
//importar express.json para poder manejar json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/api/users", UserRoutes);

app.use(errorHandler);
AppDataSource.initialize()

  .then(() => console.log("Base de datos conectada correctamente"))
  .catch((err) => console.error("No se pudo conectar a la Bd", err));

export default app;
