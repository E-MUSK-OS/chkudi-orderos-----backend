import "dotenv/config";

import { createServer } from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { initSocket } from "./socket/socket.js";

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
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
