import { AppDataSource } from "@src/data-source/AppDataSource";
import { User } from "@src/models/User";
import { add_user_dto, edit_user_dto } from "@src/types/user";
import axios from "axios";
import { JWT_SECRET } from "config/config";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { throwHttpError } from "@src/utils/errors";
import { AddUserDto } from "@src/dtos/Add-user.dto";
import { CommonValidator } from "@src/validators/common";
import { EditUserDto } from "@src/dtos/Edit-user.dto";

const EXAMS_MS_URL = process.env.EXAMS_MS_URL;
export class UserService {
  private user_repository = AppDataSource.getRepository(User);

  async login(email: string, contrasena: string) {
    if (!email || !contrasena) {
      throw new Error("Por favor ingrese Correo y contraseña");
    }
    const usuario = await this.user_repository.findOne({
      where: { email },
    });

    if (!usuario) {
      throw new Error("No se encontró un usuario con ese correo");
    }

    const contrasena_valida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasena_valida) {
      throw new Error("Contraseñla incorrecta");
    }

    // Validar que JWT_SECRET esté definido
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado");
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    return {
      message: "Login exitoso",
      token,
      usuario: payload,
    };
  }

  async AddUser(rawData: any): Promise<User> {
    const validator = new CommonValidator();

    const data = await validator.validateDto(AddUserDto, rawData);

    const existingUser = await this.user_repository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throwHttpError("El correo electrónico ya está en uso", 409);
    }
    if (data.contrasena !== data.confirmar_nueva_contrasena) {
      throwHttpError("Las contraseñas no coinciden", 400);
    }

    // Hash de contraseña
    const hashed_password = await bcrypt.hash(data.contrasena, 10);

    const user = this.user_repository.create({
      ...data,
      contrasena: hashed_password,
    });

    const usuario_nuevo = await this.user_repository.save(user);

    return usuario_nuevo;
  }

  async deleteUser(id: number, cookies?: any) {
    const usuario = await this.user_repository.findOne({
      where: { id },
    });

    if (!usuario) {
      throwHttpError(`No se encontró el usuario con el id ${id}`, 404);
    }

    try {
      await axios.delete(`${EXAMS_MS_URL}/api/exams/by-user/${id}`, {
        timeout: 5000,
        headers: { Cookie: cookies || "" },
      });
    } catch (error: any) {
      throwHttpError(
        "No se pudieron eliminar los exámenes asociados al usuario: " +
          error.message,
        502
      );
    }

    await this.user_repository.remove(usuario);

    return { message: "Usuario eliminado correctamente" };
  }

  async editUser(rawData: any, id: number) {
    const validator = new CommonValidator();
    const data = await validator.validateDto(EditUserDto, rawData);

    const usuario = await this.user_repository.findOne({
      where: { id },
    });

    if (!usuario) {
      throwHttpError(`No se encontró un usuario con el id ${id}`, 404);
    }

    if (data.email && data.email !== usuario.email) {
      const emailExists = await this.user_repository.findOne({
        where: { email: data.email },
      });

      if (emailExists) {
        throwHttpError("El correo electrónico ya está en uso", 409);
      }
    }

    if (data.contrasena !== undefined) {
      if (data.contrasena !== data.confirmar_nueva_contrasena) {
        throwHttpError("Las contraseñas no coinciden", 400);
      }

      usuario.contrasena = await bcrypt.hash(data.contrasena, 10);
    }
    Object.assign(usuario, {
      primer_nombre: data.primer_nombre ?? usuario.primer_nombre,
      segundo_nombre:
        data.segundo_nombre !== undefined
          ? data.segundo_nombre
          : usuario.segundo_nombre,
      primer_apellido: data.primer_apellido ?? usuario.primer_apellido,
      segundo_apellido:
        data.segundo_apellido !== undefined
          ? data.segundo_apellido
          : usuario.segundo_apellido,
      email: data.email ?? usuario.email,
    });

    return await this.user_repository.save(usuario);
  }

  async getUserById(id: number) {
    try {
      const usuario_buscar = await this.user_repository.findOne({
        where: { id: id },
      });

      if (!usuario_buscar) {
        throw new Error(`No se encontró Ningún usuario con el id: ${id} `);
      }

      return usuario_buscar;
    } catch (error: any) {
      throw new Error("Ocurrió un error inesperado: " + error.message);
    }
  }

  async getAllusers() {
    try {
      const usuarios = await this.user_repository.find({
        select: [
          "id",
          "primer_nombre",
          "segundo_apellido",
          "primer_apellido",
          "segundo_apellido",
          "email",
        ],
      });

      return usuarios;
    } catch (error: any) {
      throw new Error("Error inesperado: " + error.message);
    }
  }
}
