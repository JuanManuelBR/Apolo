import { UserService } from "@src/services/UserService";

import { Request,Response } from "express";

const user_service = new UserService();

export class UserController {
  static async AddUser(req: Request,  res: Response) {
    try {
      const data = req.body;
      const usuario_nuevo = await user_service.AddUser(data);
      return res.status(201).json(usuario_nuevo);
    } catch (error:any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
