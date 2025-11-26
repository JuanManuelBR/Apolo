import { Question } from "@src/models/Question";
import { AppDataSource } from "../data-source/AppDataSource";
import { creado_test_question_dto, QuestionType } from "@src/types/Question";
import { TestOption } from "@src/models/TestOption";
import { TestQuestion } from "@src/models/TestQuestion";

const questionRepo = AppDataSource.getRepository(Question);
const testQuestionRepo = AppDataSource.getRepository(TestQuestion);
const testOptionRepo = AppDataSource.getRepository(TestOption);

export class QuestionService {
  async addTestType(data: creado_test_question_dto) {
  try {
    const pregunta = testQuestionRepo.create({
      enunciado: data.enunciado,
      puntaje: data.puntaje,
      type: QuestionType.TEST,
      shuffleOptions: data.shuffleOptions,
      exam: { id: data.id_examen },
      options: data.options.map((opt) => ({
        texto: opt.texto,
        esCorrecta: opt.esCorrecta,
      })),
    });

    const saved = await testQuestionRepo.save(pregunta);

    return saved;

  } catch (error) {
    console.error("Error creando pregunta tipo test:", error);
    throw error;
  }
}
}
