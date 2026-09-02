import "dotenv/config";

import { createServer } from "http";

import app from "./app.js";

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log(`🌍 http://localhost:${PORT}`);
  console.log("=================================");
});
