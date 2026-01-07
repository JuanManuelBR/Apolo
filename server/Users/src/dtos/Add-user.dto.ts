import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class AddUserDto {
  @IsNotEmpty({ message: "Nombre(s) obligatorio" })
  @IsString({ message: "Nombre(s) debe ser un String" })
  nombres!: string;

  @IsNotEmpty({ message: "Apellido(s) obligatorio" })
  @IsString({ message: "Apellido(s) debe ser un string" })
  apellidos!: string;

  @IsNotEmpty({ message: "Correo electrónico es obligatorio" })
  @IsEmail({}, { message: "Ingrese un correo electrónico válido" })
  email!: string;

  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  @IsString({ message: "La contraseña debe ser un string" })
  contrasena!: string;

  @ValidateIf((o) => o.contrasena !== undefined)
  @IsString()
  confirmar_nueva_contrasena!: string;
}
