// src/models/Exam.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { Consecuencia, ExamenState, TiempoAgotado } from "../types/Exam";
import { Question } from "./Question";

@Entity("examenes")
export class Exam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  nombre!: string;

  @Column({ type: "text" })
  descripcion?: string;

  @Column({ type: "text" })
  codigoExamen?: string;

  // ✅ CORREGIDO: Agregado nullable: true
  @Column({ type: "varchar", length: 255, nullable: true })
  contrasena?: string | null;

  @CreateDateColumn()
  fecha_creacion!: Date;

  @Column({ type: "enum", enum: ExamenState })
  estado!: ExamenState;

  @Column()
  id_profesor!: number;

  @Column({ type: "boolean" })
  necesitaNombreCompleto!: boolean;

  @Column({ type: "boolean" })
  necesitaCorreoElectrónico!: boolean;

  @Column({ type: "boolean" })
  necesitaCodigoEstudiantil!: boolean;

  @Column({ type: "boolean" })
  incluirHerramientaDibujo!: boolean;

  @Column({ type: "boolean" })
  incluirCalculadoraCientifica!: boolean;

  @Column({ type: "boolean" })
  incluirHojaExcel!: boolean;

  @Column({ type: "boolean" })
  incluirJavascript!: boolean;

  @Column({ type: "boolean" })
  incluirPython!: boolean;

  @Column({ type: "datetime" })
  horaApertura!: Date;

  @Column({ type: "datetime" })
  horaCierre!: Date;

  @Column({ type: "int" })
  limiteTiempo!: number;

  @Column({ type: "enum", enum: TiempoAgotado })
  limiteTiempoCumplido!: TiempoAgotado;

  @Column({ type: "boolean" })
  necesitaContrasena!: boolean;

  @Column({ type: "enum", enum: Consecuencia })
  consecuencia!: Consecuencia;

  // ⭐ CAMPO NUEVO PARA PDF
  @Column({ type: "varchar", length: 255, nullable: true })
  archivoPDF?: string | null;

  @OneToMany(() => Question, (question) => question.exam, {
    onDelete: "CASCADE",
    eager: true,
  })
  questions!: Question[];
}