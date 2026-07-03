import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log(`🌍 http://localhost:${PORT}`);
  console.log("=================================");
});