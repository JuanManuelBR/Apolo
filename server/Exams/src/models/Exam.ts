import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { ExamenState } from "../types/Exam";
import { Question } from "./Question";
@Entity("examenes")
export class Exam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  nombre!: string;

  @Column({ type: "varchar", length: 255 })
  clave!: string;

  @CreateDateColumn()
  fecha_creacion!: Date;

  @Column({ type: "enum", enum: ExamenState })
  estado!: ExamenState;

  @Column()
  id_profesor!: number;

  @OneToMany(() => Question, (question) => question.exam, { cascade: true, eager: false})
  questions!: Question[];
}
