// add-match-pair.dto.ts
import { IsNotEmpty, IsString } from "class-validator";

export class MatchPairDto {
  @IsString()
  @IsNotEmpty({ message: "El texto de la columna A es obligatorio" })
  itemA!: string;

  @IsString()
  @IsNotEmpty({ message: "El texto de la columna B es obligatorio" })
  itemB!: string;
}