import { ExamenState } from "@src/types/Exam";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { BaseQuestionDto } from "./base-question.dto";
import { QUESTION_DTO_MAP } from "./question-dto-map";
import { TestQuestionDto } from "./add-test-question.dto";
import { OpenQuestionDto } from "./add-open-question.dto";
import { FillBlankQuestionDto } from "./add-blank-question.dto";

export class add_exam_dto {
  @IsString({ message: "Nombre debe ser string" })
  @IsNotEmpty({ message: "Nombre no puede ser nulo" })
  nombre!: string;

  @IsString({ message: "La clave debe ser string" })
  @IsNotEmpty({ message: "La clave del examen es obligatoria" })
  clave!: string;

  @Type(() => Date)
  @IsNotEmpty({ message: "La fecha de creación es obligatoria" })
  fecha_creacion!: Date;

  @IsIn(Object.values(ExamenState), {
    message:
      "El formato del estado del examen es incorrecto, debe ser open o closed",
  })
  @IsNotEmpty({ message: "El estado del examen es obligatorio" })
  estado!: ExamenState;

  @IsNumber(
    {},
    { message: "El id del profesor proporcionada tiene formato incorrecto" }
  )
  @IsNotEmpty({
    message:
      "Es obligatorio proporcionar el id de un profesor al crear un examen",
  })
  id_profesor!: number;

  @IsNotEmpty()
  @IsArray({ message: "Las preguntas deben ser un array" })
  @ValidateNested({ each: true })
  @Type(() => BaseQuestionDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "type",
      subTypes: [
        { value: TestQuestionDto, name: "test" },
        { value: OpenQuestionDto, name: "open" },
        { value: FillBlankQuestionDto, name: "fill_blanks" },

      ],
    },
  })
  questions!: BaseQuestionDto[];
}
