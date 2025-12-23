import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class OpenQuestionKeyword {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  texto!: string;


  @ManyToOne("OpenQuestion", "keywords", { onDelete: "CASCADE" })
  question!: any;
}
