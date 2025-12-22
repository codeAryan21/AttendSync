import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth.routes"
import { authMiddleware } from "./middlewares/auth.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: true, limit: '16mb' }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

// Routes
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "This is a protected route" });
});
app.use("/api/auth", authRouter);


app.use(errorHandler); // Middleware

export default app;