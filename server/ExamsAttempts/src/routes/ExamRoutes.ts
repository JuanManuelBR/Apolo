import { Router } from "express";
import { ExamController } from "@src/controllers/ExamController";

const router = Router();

router.post("/attempt", ExamController.createAttempt);
router.post("/answer", ExamController.createAnswer);
router.post("/event", ExamController.createEvent);
router.post("/in-progress", ExamController.createExamInProgress);

export default router;
