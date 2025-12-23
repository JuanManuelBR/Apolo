import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from "typeorm";

@Entity()
export class MatchItemA {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;

  @OneToMany("MatchPair", "itemA", { onDelete: "CASCADE" })
  par!: any;
}