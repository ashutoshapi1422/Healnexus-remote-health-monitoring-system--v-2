import type { Express } from "express";
import { createServer, type Server } from "http";
import { firebaseService } from "./firebase";
import { healthDataSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health-check", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get current health data from Firebase
  app.get("/api/health/current", async (req, res) => {
    try {
      const data = await firebaseService.getCurrentHealthData();

      if (!data) {
        return res.status(404).json({
          error: "No health data available",
          message: "Unable to fetch data from Firebase Realtime Database"
        });
      }

      // Validate data with Zod schema
      const validatedData = healthDataSchema.parse(data);
      res.json(validatedData);
    } catch (error) {
      console.error("Error fetching current health data:", error);
      res.status(500).json({
        error: "Failed to fetch health data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get historical health data for charts
  app.get("/api/health/history", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const data = await firebaseService.getHistoricalHealthData(start, end);
      res.json(data);
    } catch (error) {
      console.error("Error fetching historical health data:", error);
      res.status(500).json({
        error: "Failed to fetch historical data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all historical data for export with date range filtering
  app.get("/api/health/export", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const data = await firebaseService.getExportData(start, end);
      res.json(data);
    } catch (error) {
      console.error("Error fetching export data:", error);
      res.status(500).json({
        error: "Failed to fetch export data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Chatbot endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, language = "English" } = req.body;
      console.log(`Received chat message: "${message}" in language: ${language}`);

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get current health data for context
      console.log("Fetching health data...");
      const healthData = await firebaseService.getCurrentHealthData();
      console.log("Health data fetched:", healthData ? "Success" : "Null");

      // Initialize Gemini
      console.log("Initializing Gemini with key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        You are a health assistant chatbot for the HealNexus dashboard.
        Your role is to answer questions specifically about health monitoring, disease, and the user's current health data.
        
        Current Health Data:
        ${JSON.stringify(healthData, null, 2)}
        
        User Question: ${message}
        Target Language: ${language}
        
        Instructions:
        1. Answer ONLY questions related to health, disease, and the provided health data.
        2. If the user asks about anything else (e.g., sports, politics, general knowledge), politely refuse and state that you can only discuss health topics.
        3. Use the provided health data to give specific answers. For example, if asked "What is my heart rate?", use the 'bpm' value from the data.
        4. Keep answers concise and helpful.
        
        LANGUAGE REQUIREMENT:
        The user has explicitly selected **${language}** as their preferred language.
        You MUST provide your ENTIRE response in **${language}**.
        - If ${language} is "Odia", use Odia script (e.g., ନମସ୍କାର).
        - If ${language} is "Hindi", use Devanagari script.
        - If ${language} is "Bengali", use Bengali script.
        - If ${language} is "Telugu", use Telugu script.
        - If ${language} is "Tamil", use Tamil script.
        - Do NOT reply in English unless the target language is English.
      `;

      console.log("Sending prompt to Gemini...");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("Gemini response received");

      res.json({ response: text });
    } catch (error) {
      console.error("Error in chatbot:", error);
      res.status(500).json({
        error: "Failed to process chat request",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
