import { AppDataSource } from "@src/data-source/AppDataSource";
import { Server } from "socket.io";
import { ExamAttempt } from "@src/models/ExamAttempt";
import { ExamAnswer } from "@src/models/ExamAnswer";
import { ExamEvent } from "@src/models/ExamEvent";
import { ExamInProgress } from "@src/models/ExamInProgress";

export class ExamService {
  static async createAttempt(data: any, io: Server) {
    const repo = AppDataSource.getRepository(ExamAttempt);
    const attempt = repo.create({
      ...data,
      fecha_inicio: new Date(),
    });
    await repo.save(attempt);
    io.emit("attempt_created", attempt);
    return attempt;
  }

  static async createAnswer(data: any, io: Server) {
    const repo = AppDataSource.getRepository(ExamAnswer);
    const answer = repo.create(data);
    await repo.save(answer);

    io.emit("answer_created", answer);

    return answer;
  }

  static async createEvent(data: any, io: Server) {
    const repo = AppDataSource.getRepository(ExamEvent);
    const event = repo.create(data);
    await repo.save(event);

    io.emit("event_created", event);

    return event;
  }

  static async createExamInProgress(data: any, io: Server) {
    const repo = AppDataSource.getRepository(ExamInProgress);
    const exam = repo.create(data);
    await repo.save(exam);

    io.emit("exam_in_progress_created", exam);

    return exam;
  }
}
