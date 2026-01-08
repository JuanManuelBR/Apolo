// ============================================
// 📁 BACKEND/src/routes/UserRoutes.ts
// CÓDIGO COMPLETO CON RUTAS DE HEARTBEAT
// ============================================

import { UserController } from "@src/controllers/UserController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";

const router = Router();

// ============================================
// RUTAS PÚBLICAS (Sin autenticación)
// ============================================

// Autenticación
router.post("/login", UserController.login);
router.post("/logout", UserController.logout);

// ✅ NUEVO: Heartbeat (sin autenticación para que funcione con sendBeacon)
router.post("/heartbeat", UserController.heartbeat);

// Registro
router.post("/", UserController.AddUser);

// Endpoints para Firebase
router.get("/email/:email", UserController.getUserByEmail);
router.get("/firebase/:firebaseUid", UserController.getUserByFirebaseUid);
router.post("/find-or-create", UserController.findOrCreateUser);

// Actualizar último acceso (para Google)
router.patch("/:id/update-access", UserController.updateLastAccess);

// ============================================
// RUTAS PROTEGIDAS (Con autenticación)
// ============================================

router.use(authMiddleware);

router.get("/", UserController.getUsers);
router.get("/active", UserController.getActiveUsers); // ✅ NUEVO: Usuarios activos
router.get("/:id", UserController.getUserById);
router.delete("/:id", UserController.deleteUser);
router.put("/:id", UserController.editUser);

export default router;