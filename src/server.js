import "dotenv/config";

import { createServer } from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { initSocket } from "./socket/socket.js";

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

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

const io = new Server(httpServer, {
  cors: {
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
      return callback(null, true);
    },
    credentials: true,
  },
});

initSocket(io);

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join:user", (userId) => {
    if (!userId) return;

    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined room user:${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", socket.id, reason);
  });
});

httpServer.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log(`🌍 http://localhost:${PORT}`);
  console.log("=================================");
});

