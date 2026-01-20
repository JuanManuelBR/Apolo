import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
} from "typeorm";
import { ExamInProgress } from "./ExamInProgress";
import { ExamAnswer } from "./ExamAnswer";

export enum AttemptState {
  ACTIVE = "activo",
  BLOCKED = "blocked",
  PAUSED = "paused",
  FINISHED = "finished",
}

@Entity("exam_attempts")
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  examen_id!: number;

  @Column({ type: "text" })
  estado!: AttemptState;
  
  @Column({ type: "text", nullable: true })
  nombre_estudiante?: string | null;

  @Column({ type: "text", nullable: true })
  correo_estudiante?: string | null;

  @Column({ type: "text", nullable: true })
  identificacion_estudiante?: string | null;

  @Column({ type: "double", nullable: true })
  puntaje?: number | null;

  @Column({ type: "double" })
  puntajeMaximo!: number;

  @Column({ type: "datetime" })
  fecha_inicio!: Date;

  @Column({ type: "datetime", nullable: true })
  fecha_fin ?: Date | null;

  @ManyToOne(() => ExamAttempt, { onDelete: "CASCADE" })
  examenes_en_curso?: ExamInProgress[];

  @ManyToOne(() => ExamAnswer, { onDelete: "CASCADE" })
  respuestas ?: ExamAnswer[];
}
