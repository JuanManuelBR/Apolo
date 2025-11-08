import { UserController } from "@src/controllers/UserController";
import { Router } from "express";

const router = Router();



router.post("/", UserController.AddUser);

export default router;
