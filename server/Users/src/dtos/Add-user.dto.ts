import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class AddUserDto {
  @IsNotEmpty({ message: "Primer Nombre es obligatorio" })
  @IsString({ message: "Primer nombre debe ser un String" })
  primer_nombre!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: "Segundo nombre debe ser un String" })
  segundo_nombre?: string | null;

  @IsNotEmpty({ message: "Primer Apellido es obligatorio" })
  @IsString({ message: "Primer Apellido debe ser un String" })
  primer_apellido!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: "Segundo apellido debe ser un String" })
  segundo_apellido?: string;

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
