import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MatchQuestion } from "./MatchQuestion";
import { MatchItemA } from "./MatchItemA";
import { MatchItemB } from "./MatchItemB";
import { Exclude } from "class-transformer"; // Asegúrate de tener esta librería

@Entity()
@Entity()
export class MatchPair {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MatchItemA, {
    cascade: true,
    eager: true,
    onDelete: "CASCADE",
  })
  itemA!: MatchItemA;

  @ManyToOne(() => MatchItemB, {
    cascade: true,
    eager: true,
    onDelete: "CASCADE",
  })  
  itemB!: MatchItemB;

  @Exclude()
  @ManyToOne("MatchQuestion", "pares", { onDelete: "CASCADE" })
  @JoinColumn({ name: "questionId" })
  question!: any;
}
