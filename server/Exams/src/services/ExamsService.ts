import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";

import { CommonValidator } from "@src/validators/common";

import { add_exam_dto } from "@src/dtos/add-exam.dto";
import { Question } from "@src/models/Question";

import { examenValidator } from "@src/validators/examen-validator";

import { QuestionValidator } from "@src/validators/question-validator";
import { throwHttpError } from "@src/utils/errors";

export class ExamService {
  private examRepo = AppDataSource.getRepository(Exam);

  async addExam(rawData: any, cookies?: string) {
    const validator = new CommonValidator();
    const data = await validator.validateDto(add_exam_dto, rawData);

    const id_profesor = Number(data.id_profesor);
    if (isNaN(id_profesor)) {
      throwHttpError("ID de profesor inválido", 400);
    }

    await examenValidator.verificarProfesor(id_profesor, cookies);
    await examenValidator.verificarExamenDuplicado(data.nombre, id_profesor);

    return await AppDataSource.transaction(async (manager) => {
      const nuevo_examen = manager.create(Exam, {
        nombre: data.nombre,
        clave: data.clave,
        estado: data.estado,
        id_profesor,
        fecha_creacion: new Date(data.fecha_creacion),
      });

      const examen_guardado = await manager.save(Exam, nuevo_examen);

      if (data.questions?.length) {
        const preguntas = QuestionValidator.crearPreguntasDesdeDto(
          data.questions,
          examen_guardado
        );

        const preguntas_guardadas = await manager.save(Question, preguntas);

        examen_guardado.questions = preguntas_guardadas;
        examen_guardado.questions.forEach((q) => delete (q as any).exam);
      }

      return examen_guardado;
    });
  }

  async listExams() {
    const examenes = await this.examRepo.find({
      relations: ["questions"],
    });

    return examenes;
  }

  async getExamsByUser(userId: number, cookies?: string) {
    await examenValidator.verificarProfesor(userId, cookies);

    return await this.examRepo.find({
      where: { id_profesor: userId },
      relations: ["questions"],
    });
  }

  async deleteExamsByUser(userId: number, cookies?: string) {
    await examenValidator.verificarProfesor(userId, cookies);

    await this.examRepo.delete({
      id_profesor: userId,
    });
  }
}
