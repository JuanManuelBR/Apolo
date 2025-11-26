import { ExamsController } from "@src/controllers/ExamController";
import { Router } from "express";
import { authMiddleware } from "@src/middlewares/auth";
import { QuestionsController } from "@src/controllers/QuestionController";



const router = Router();

router.use(authMiddleware);
router.post("/testQuestion", QuestionsController.createTestQuestion);


export default router;