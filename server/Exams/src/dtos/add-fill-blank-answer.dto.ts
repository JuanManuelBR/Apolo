import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class FillBlankAnswerDto {
  @IsNumber({}, { message: "La posición debe ser un número." })
  @IsNotEmpty()
  posicion!: number;

  @IsString({ message: "El texto correcto debe ser un string." })
  @IsNotEmpty({ message: "El texto correcto no puede estar vacío." })
  textoCorrecto!: string;
}