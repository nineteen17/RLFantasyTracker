import "reflect-metadata";
import { errorMiddleware } from "@src/logic/shared/middleware/error.middleware";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Router, Response, Request } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./config/openapi";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./logic/shared/middleware/auth.middleware";
import { loggingMiddleware } from "./logic/shared/middleware/logging.middleware";
import rateLimit from "express-rate-limit";

dotenv.config();

// Configure CORS with specific allowed origins and allow credentials (cookies, headers)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5001",
  "http://192.168.1.7:5001",
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Too many attempts, please try again later",
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: "Too many requests, please slow down",
});

// Registers all application routes and submodules
const registerRoutes = async (): Promise<Router> => {
  const router = Router();

  router.get("/health", (_, res): void => {
    res.send("OK");
  });

  // Lazy-load routes
  const auth = (await import("@model/auth/auth.routes")).default;
  const teams = (await import("@model/teams/teams.routes")).default;
  const players = (await import("@model/players/players.routes")).default;
  const venues = (await import("@model/venues/venues.routes")).default;
  const live = (await import("@model/live/live.routes")).default;
  const casualty = (await import("@model/casualty/casualty.routes")).default;

  router.use("/auth", authRateLimiter, auth);
  router.use("/api", apiRateLimiter);
  router.use("/api/teams", teams);
  router.use("/api/players", players);
  router.use("/api/venues", venues);
  router.use("/api/live", live);
  router.use("/api/casualty-ward", casualty);

  router.get(
    "/test",
    authMiddleware,
    loggingMiddleware,
    (req: Request, res: Response) => {
      res.status(200).json({
        authenticated: true,
        uuid: req.auth?.uuid,
        username: req.auth?.username,
        email: req.auth?.email,
      });
    },
  );

  return router;
};

// Main app factory function that initializes the Express application
export const createApp = async (): Promise<Express> => {
  const app = express();

  // Enables CORS for frontend and local development — must be first
  app.use(cors(corsOptions));

  app.use(cookieParser());

  // Sets secure HTTP headers using Helmet
  app.use(helmet());

  // Parses incoming JSON requests
  app.use(express.json());

  // Register all routes under the /api base path
  app.use("/", await registerRoutes());

  // Serve Swagger UI documentation at /api-docs
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // Global error handling middleware
  app.use(errorMiddleware);

  return app;
};
