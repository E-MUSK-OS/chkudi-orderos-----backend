import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";


import routes from "./routes/index.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import "./crons/sheetDraft.cron.js";
import "./crons/amazonOrder.cron.js";

const app = express();


const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://chakudee.com",
  "https://www.chakudee.com",
  "https://chkudi-orderos-frontend.vercel.app",
];


if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}


app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin === "https://chakudee.com" ||
        origin === "https://www.chakudee.com" ||
        origin.endsWith(".chakudee.com") ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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


app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));


import path from "path";
import { getAmazonBatchRootDir } from "./utils/amazonBatchNasPath.js";

// Serve Amazon batches directly from configured NAS storage
app.use("/uploads/amazon-batches", express.static(getAmazonBatchRootDir()));

// Serve public static folder
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
