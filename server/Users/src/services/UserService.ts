import { AppDataSource } from "@src/data-source/AppDataSource";
import { User } from "@src/models/User";
import { add_user_dto } from "@src/types/user";
import bcrypt from "bcrypt";

export class UserService {
  private user_repository = AppDataSource.getRepository(User);

  async AddUser(data: add_user_dto): Promise<User> {
    try {
      const requiredFields = [
        "primer_nombre",
        "primer_apellido",
        "tipo",
        "email",
        "contrasena",
      ];

      for (const field of requiredFields) {
        if (
          data[field as keyof add_user_dto] === undefined ||
          data[field as keyof add_user_dto] === null
        ) {
          throw new Error(`Falta el campo obligatorio del usuario: ${field}`);
        }
      }

      const existingUser = await this.user_repository.findOne({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error("El correo electrónico ya está en uso");
      }

      const salt = 10;
      const hashed_password = await bcrypt.hash(data.contrasena, salt);
      data.contrasena = hashed_password;

      const user = this.user_repository.create(data);

      const usuario_nuevo = await this.user_repository.save(user);

      return usuario_nuevo;
    } catch (error: any) {
      console.error("No se pudo crear el nuevo usuario", error.message);

      throw error;
    }
  }
}
