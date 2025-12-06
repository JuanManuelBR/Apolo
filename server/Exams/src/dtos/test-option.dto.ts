// test-option.dto.ts
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class TestOptionDto {
  @IsOptional() 
  @IsNumber({}, { message: "El id debe ser numérico." })
  id?: number;

  @IsString({ message: "El texto de la opción debe ser una cadena de texto." })
  texto!: string;

  @IsBoolean({ message: "El campo 'esCorrecta' debe ser un valor booleano." })
  esCorrecta!: boolean;

  @IsOptional() 
  @IsNumber({}, { message: "El questionId debe ser numérico." })
  questionId?: number;
}