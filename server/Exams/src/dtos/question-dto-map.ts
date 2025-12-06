// question-dto-map.ts
import { QuestionType } from "@src/types/Question";
import { TestQuestionDto } from "./add-test-question.dto";
import { BaseQuestionDto } from "./base-question.dto";
import { OpenQuestionDto } from "./add-open-question.dto";
import { FillBlanksQuestionDto } from "./add-fill-blanks-question.dto";
import { MatchingQuestionDto } from "./add-matching-question.dto";
//import { OpenQuestionDto } from "./add-open-question.dto";
//import { TrueFalseQuestionDto } from "./add-true-false-question.dto";

export const QUESTION_DTO_MAP: Record<QuestionType, new () => BaseQuestionDto> =
  {
    [QuestionType.TEST]: TestQuestionDto,
    [QuestionType.OPEN]: OpenQuestionDto,
    [QuestionType.FILL_BLANKS]: FillBlanksQuestionDto,
    [QuestionType.MATCHING]: MatchingQuestionDto,
  };
