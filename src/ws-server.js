import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
// Default to 5001 to avoid conflicting with the main REST API if run locally
const PORT = process.env.WS_PORT || 5001;
const INTERNAL_SECRET = process.env.INTERNAL_WS_SECRET || "default_internal_ws_secret_123";

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join:user", (userId) => {
    if (!userId) return;

    socket.join(`user:${userId}`);
    console.log(`👥 User ${userId} joined room user:${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", socket.id, reason);
  });
});

// Internal REST endpoint to bridge emits from the Vercel REST API
app.post("/internal/emit", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${INTERNAL_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { room, event, data } = req.body;
  
  if (!event) {
    return res.status(400).json({ error: "Event name is required" });
  }

  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }

  res.status(200).json({ success: true });
});

httpServer.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Standalone WebSocket Server running on Port ${PORT}`);
  console.log("=================================");
});
