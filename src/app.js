import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes/index.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import "./crons/sheetDraft.cron.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(compression());
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "path";
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Chkudi OrderOS Backend Running",
  });
});

app.use("/api/v1", routes);
app.use(errorHandler);

export default app;