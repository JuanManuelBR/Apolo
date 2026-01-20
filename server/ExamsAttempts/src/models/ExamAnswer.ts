import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
} from "typeorm";
import type { ExamAttempt } from "./ExamAttempt";


@Entity("exam_answers")
export class ExamAnswer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  pregunta_id!: number;

  @Column({ type: "text" })
  respuesta!: string;

  @Column({ type: "datetime" })
  fecha_respuesta!: Date;

  @OneToOne("ExamAttempt", "respuestas")
  intento!: ExamAttempt;
}
