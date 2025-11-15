import { UserController } from "@src/controllers/UserController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";

const router = Router();
router.post("/login", UserController.login);
router.post("/logout", UserController.logout);
router.use(authMiddleware);
router.get("/", UserController.getUsers);

router.get("/:id", UserController.getUserById);

router.post("/", UserController.AddUser);

router.delete("/:id", UserController.deleteUser);

router.put("/:id", UserController.editUser);

export default router;
