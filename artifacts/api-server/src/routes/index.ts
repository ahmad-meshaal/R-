import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import novelsRouter from "./novels";
import chaptersRouter from "./chapters";
import commentsRouter from "./comments";
import likesRouter from "./likes";
import libraryRouter from "./library";
import followsRouter from "./follows";
import aiRouter from "./ai";
import geminiRouter from "./gemini";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/novels", novelsRouter);
router.use("/novels/:novelId/chapters", chaptersRouter);
router.use("/novels/:novelId/chapters/:chapterId/comments", commentsRouter);
router.use("/novels/:novelId/like", likesRouter);
router.use("/library", libraryRouter);
router.use("/follows", followsRouter);
router.use("/ai", aiRouter);
router.use("/gemini", geminiRouter);

export default router;
