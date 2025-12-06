import { QuestionType } from "@src/types/Question";
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

// Se marca como abstracta
export abstract class BaseQuestionDto {
  @IsString({ message: "El enunciado debe ser una cadena de texto." })
  enunciado!: string;

  @IsNumber({}, { message: "El puntaje debe ser un número." })
  puntaje!: number;

  @IsIn(Object.values(QuestionType))
  type!: QuestionType;

  @IsNumber({}, { message: "El ID del examen debe ser un número." })
  @IsOptional()
  id_examen?: number;
}
