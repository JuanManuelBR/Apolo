import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
} from "typeorm";
import type { ExamAttempt } from "./ExamAttempt";

export enum AttemptState {
  ACTIVE = "activo",
  BLOCKED = "blocked",
  PAUSED = "paused",
  FINISHED = "finished",
}

@Entity("exams_in_progress")
export class ExamInProgress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: "text"})
  codigo_acceso!: string;

  @Column({ type: "text" })
  estado!: AttemptState;

  @Column({ type: "datetime" })
  fecha_inicio!: Date;

  @Column({ type: "datetime", nullable: true })
  fecha_fin!: Date | null;

  @Column({ type: "text" })
  id_sesion?: string;

  @Column({ type: "datetime", nullable: true })
  fecha_expiracion?: Date | null;

  @OneToOne("ExamAttempt", "examenes_en_curso")
  intento!: ExamAttempt;
}
