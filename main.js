import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./lib/db.js";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import consumerAuthRoutes from "./routes/consumer/consumerAuthRoutes.js";
import generateVideoRoutes from "./routes/consumer/generateVideoRoutes.js";

// ✅ Load env FIRST
dotenv.config();

const app = express();

// ✅ Required for ES Modules (__dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 🔥 VERY IMPORTANT: Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================
// HTTP Server
// =====================
const server = http.createServer(app);

// =====================
// Start Server
// =====================
const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB Connected");

    app.get("/", (req, res) => {
      res.send("API Running");
    });

    // Routes
    app.use("/api/consumer", consumerAuthRoutes);
    app.use("/api/consumer/video", generateVideoRoutes);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();

