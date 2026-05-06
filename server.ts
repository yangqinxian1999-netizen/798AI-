import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: {
      has_url: !!process.env.VITE_DIFY_API_URL,
      has_key: !!process.env.DIFY_API_KEY
    } });
  });

  // Dify Proxy Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { query, user = "agent_user_798", inputs = {}, conversation_id = "" } = req.body;
      const DIFY_API_URL = (process.env.VITE_DIFY_API_URL || "https://api.dify.ai/v1").replace(/\/$/, '');
      const DIFY_API_KEY = process.env.DIFY_API_KEY || "app-opGEphJ1sNjKulEJKfbApfkf"; 

      console.log(`[Dify Proxy Request] URL: ${DIFY_API_URL}/chat-messages`);
      
      const response = await axios.post(`${DIFY_API_URL}/chat-messages`, {
        inputs,
        query,
        user,
        response_mode: "blocking",
        conversation_id: conversation_id || undefined
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DIFY_API_KEY}`,
        },
        timeout: 30000 // 30s timeout
      });

      console.log(`[Dify Success] Status: ${response.status}`);
      res.json(response.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error(`[Dify Axios Error] Status: ${error.response?.status}, Data:`, error.response?.data);
        const status = error.response?.status || 500;
        const message = error.response?.data || error.message;
        res.status(status).json({ 
          error: "Dify API Error", 
          details: message,
          code: error.code
        });
      } else {
        console.error("[Dify Unexpected Error]:", error);
        res.status(500).json({ 
          error: "Internal Server Error during Dify connection", 
          details: error.message 
        });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
