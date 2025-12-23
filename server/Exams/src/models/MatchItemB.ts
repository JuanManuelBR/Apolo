import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm";

@Entity()
export class MatchItemB {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;

  @OneToMany("MatchPair", "itemB", { onDelete: "CASCADE" })
    par!: any;
}