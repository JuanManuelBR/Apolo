import { Exam } from "@src/models/Exam";
import { Question } from "@src/models/Question";

export class QuestionValidator {
  static crearPreguntasDesdeDto(questionsDto: any[], exam: Exam): Question[] {
    return questionsDto.map((questionDto) => {
      // Crear objeto plano con los campos comunes
      const preguntaBase: any = {
        enunciado: questionDto.enunciado,
        type: questionDto.type,
        puntaje: questionDto.puntaje,
        exam: exam,
      };

      // Agregar campos específicos según el tipo de pregunta
      switch (questionDto.type) {
        case "test":
          return {
            ...preguntaBase,
            shuffleOptions: questionDto.shuffleOptions,
            options:
              questionDto.options?.map((opt: any) => ({
                texto: opt.texto,
                esCorrecta: opt.esCorrecta,
              })) || [],
          };

        case "TRUE_FALSE":
          return {
            ...preguntaBase,
            respuestaCorrecta: questionDto.respuestaCorrecta,
          };

        case "OPEN":
          return {
            ...preguntaBase,
            respuestaSugerida: questionDto.respuestaSugerida || null,
          };

        default:
          throw new Error(`Tipo de pregunta no soportado: ${questionDto.type}`);
      }
    });
  }
}
