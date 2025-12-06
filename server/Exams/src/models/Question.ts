import {
  Entity,
  TableInheritance,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Exam } from "./Exam";

@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export abstract class Question {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  enunciado!: string;

  @Column({ type: "float", default: 1 })
  puntaje!: number;

  @Column()
  type!: string;

  @Column({ type: "int", name: "examId" })
  examId!: number;
  
  @ManyToOne("Exam", "questions", { onDelete: "CASCADE" })
  @JoinColumn({ name: "examId" })
  exam!: Exam;
}
