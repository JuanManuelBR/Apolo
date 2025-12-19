import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export class EditUserDto {
  @IsOptional()
  @IsString()
  primer_nombre?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  segundo_nombre?: string | null;

  @IsOptional()
  @IsString()
  primer_apellido?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  segundo_apellido?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contrasena?: string;

  @ValidateIf((o) => o.contrasena !== undefined)
  @IsString()
  confirmar_nueva_contrasena?: string;
}
