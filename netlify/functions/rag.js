// apps/server/src/rag.js
import * as fs from 'fs';
import { promises as fsPromises } from "node:fs"; // Use promises for specific operations
import path from "node:path";
import pkg from "pdf-parse";
const pdf = pkg;
import {
  Document,
  VectorStoreIndex,
  Settings,
  storageContextFromDefaults,
} from "llamaindex";


import { HuggingFaceEmbedding } from "@llamaindex/huggingface";
import { GoogleGenAI } from "@google/genai";

import dotenv from 'dotenv';
dotenv.config();

// ------------------------
// Configure embeddings
// ------------------------
Settings.embedModel = new HuggingFaceEmbedding({ model: "Xenova/all-MiniLM-L6-v2" });

// ------------------------
// Initialize Google Gemini API client
// ------------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ------------------------
// Index chunking
// ------------------------
Settings.chunkSize = 900;
Settings.chunkOverlap = 150;

const dataDir = path.join(process.cwd(), "data");

// ------------------------
// Build or load PDF index
// ------------------------
export async function ensureIndexForDoc({ docId, filePath }) {
  try {
    const persistDir = path.join(dataDir, docId);
    await fsPromises.mkdir(persistDir, { recursive: true }); // Use fsPromises.mkdir

    // Read PDF file
    const fileBuffer = await fsPromises.readFile(filePath);
    const pdfData = await pdf(fileBuffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF");
    }

    const doc = new Document({ text: pdfData.text, metadata: { source: filePath } });

    const storageContext = await storageContextFromDefaults({ persistDir });
    const index = await VectorStoreIndex.fromDocuments([doc], { storageContext });

    const numPages = pdfData.numpages || 1;
    const manifest = {
      pageCount: numPages,
      pages: Array.from({ length: numPages }, (_, i) => ({ page: i + 1 })),
    };
    await fsPromises.writeFile(path.join(persistDir, "pages.json"), JSON.stringify(manifest));

    return index;
  } catch (error) {
    console.error("Error in ensureIndexForDoc:", error);
    throw error;
  }
}

// ------------------------
// Query a PDF by docId with Gemini API
// ------------------------

export async function chatAboutPdf({ docId, message }) {
  const persistDir = path.join(dataDir, docId);
  const storageContext = await storageContextFromDefaults({ persistDir });
  const index = await VectorStoreIndex.init({ storageContext });

  const retriever = index.asRetriever({ similarityTopK: 5 });
  const nodes = await retriever.retrieve(message);

  // Combine retrieved chunks as context
  const contextText = nodes.map((n) => n.node.text).join("\n\n");

  // Build prompt for Gemini
  const prompt = `Answer the following question based on the context below.\n\nContext:\n${contextText}\n\nQuestion: ${message}\nAnswer:`;

  // Call Gemini API
  const completion = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const answer = completion.text || "No answer available.";

  return {
    text: answer,
    citations: nodes.map((n, i) => ({ page: i + 1, score: n.score })),
  };
}

// ------------------------
// Load stored PDF page metadata
// ------------------------
export async function getDocPages(docId) {
  const json = await fs.readFile(path.join(dataDir, docId, "pages.json"), "utf-8");
  return JSON.parse(json);
}
