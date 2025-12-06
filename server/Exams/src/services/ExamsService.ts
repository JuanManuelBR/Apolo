import { AppDataSource } from "../data-source/AppDataSource";
import { Exam } from "../models/Exam";

import { CommonValidator } from "@src/validators/common";

import { add_exam_dto } from "@src/dtos/add-exam.dto";
import { Question } from "@src/models/Question";

import { examenValidator } from "@src/validators/examen-validator";

import { QuestionValidator } from "@src/validators/question-validator";
const USER_MS_URL = process.env.USER_MS_URL;

export class ExamService {
  private examRepo = AppDataSource.getRepository(Exam);

  async addExam(rawData: any, cookies?: string) {
    try {
      const validator = new CommonValidator();
      const data = await validator.validateDto(add_exam_dto, rawData);

      const id_profesor = Number(data.id_profesor);
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

        // Si hay preguntas, procesarlas y guardarlas
        if (data.questions && data.questions.length > 0) {
          const preguntas = QuestionValidator.crearPreguntasDesdeDto(
            data.questions,
            examen_guardado.id
          );

          // Guardar las preguntas como objetos planos
          const preguntas_guardadas = await manager.save(Question, preguntas);

          examen_guardado.questions = preguntas_guardadas;
        }

        return examen_guardado;
      });
    } catch (error: any) {
      throw new Error("Ocurrió un error: " + error.message);
    }
  }

  async listExams() {
    try {
      const examenes = await this.examRepo
        .createQueryBuilder("exam")
        .select([
          "exam.id",
          "exam.nombre",
          "exam.clave",
          "exam.fecha_creacion",
          "exam.estado",
          "exam.id_profesor",
        ])
        .leftJoinAndSelect("exam.questions", "question")
        .leftJoinAndSelect("question.options", "option")
        .orderBy("exam.fecha_creacion", "DESC")
        .getMany();

      return examenes;
    } catch (error: any) {
      throw new Error("Ocurrió un error inesperado: " + error.message);
    }
  }
}
