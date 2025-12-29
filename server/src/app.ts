import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authMiddleware } from "./middlewares/auth.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { generalLimiter } from "./middlewares/rateLimit.middleware";


import authRouter from "./routes/auth.routes"
import classRouter from './routes/class.routes'
import studentRouter from './routes/student.routes'
import attendanceRouter from './routes/attendance.route'
import attendanceAnalyticsRouter from './routes/attendance.analytics.route'
import adminRouter from './routes/admin.routes'

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(generalLimiter);
app.use(helmet());
app.use(cors(corsOptions));
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
app.use("/api/admin", adminRouter);
app.use("/api/class", classRouter);
app.use("/api/student", studentRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/attendance-analytics", attendanceAnalyticsRouter);


app.use(errorHandler); // Middleware

export default app;