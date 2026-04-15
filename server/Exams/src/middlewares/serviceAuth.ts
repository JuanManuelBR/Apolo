import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import jwt from "jsonwebtoken";

// Acepta service token O token de usuario
export const authenticateAny = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  // 1. Intentar service token
  const serviceToken = req.headers["x-service-token"];
  const serviceSecret = process.env.SERVICE_SECRET;

  if (serviceSecret && serviceToken === serviceSecret) {
    return next();
  }

  // 2. Intentar token de usuario (Bearer o cookie)
  const authHeader = req.headers["authorization"] as string | undefined;
  const cookieToken = req.cookies?.token as string | undefined;

  let token: string | undefined;
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (cookieToken?.trim()) {
    token = cookieToken.trim();
  }

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "") as any;
    return next();
  } catch {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};