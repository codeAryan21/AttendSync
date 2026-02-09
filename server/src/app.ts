import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authMiddleware } from "./middlewares/auth.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { generalLimiter } from "./middlewares/rateLimit.middleware";
import { startNotificationScheduler } from "./services/scheduler.service";
import { verifyEmailConnection } from "./services/email.service";


import authRouter from "./routes/auth.routes"
import classRouter from './routes/class.routes'
import studentRouter from './routes/student.routes'
import attendanceRouter from './routes/attendance.route'
import attendanceAnalyticsRouter from './routes/attendance.analytics.route'
import adminRouter from './routes/admin.routes'
import teacherRouter from './routes/teacher.routes'
import notificationRouter from './routes/notification.routes'

const app = express();

// Verify email service connection
verifyEmailConnection().then((connected) => {
  if (connected) {
    startNotificationScheduler();
  } else {
    console.warn('Notification scheduler not started - email service unavailable');
  }
});

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false
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

// API v1 Routes
const v1Router = express.Router();

v1Router.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "This is a protected route" });
});

v1Router.use("/auth", authRouter);
v1Router.use("/admin", adminRouter);
v1Router.use("/class", classRouter);
v1Router.use("/student", studentRouter);
v1Router.use("/teacher", teacherRouter);
v1Router.use("/attendance", attendanceRouter);
v1Router.use("/attendance-analytics", attendanceAnalyticsRouter);
v1Router.use("/notifications", notificationRouter);

app.use("/api/v1", v1Router);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/class", classRouter);
app.use("/api/student", studentRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/attendance-analytics", attendanceAnalyticsRouter);
app.use("/api/notifications", notificationRouter);


app.use(errorHandler); // Middleware

export default app;