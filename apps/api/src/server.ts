import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { delightWorkflow } from "./workflow.js";

const PORT = Number(process.env.PORT || 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
const uploadDir = path.resolve(process.cwd(), "uploads");
await fs.mkdir(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) =>
      cb(
        null,
        `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^https?:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Delight" }));

app.post("/api/jobs", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Please add an image." });
    const command = String(
      req.body.command || "Make a todo list of all assignments in this image.",
    ).trim();
    if (!command)
      return res.status(400).json({ error: "Please enter a command." });

    const jobId = crypto.randomUUID();
    const handle = await DBOS.startWorkflow(delightWorkflow, {
      workflowID: jobId,
    })({ imagePath: req.file.path, command });
    return res.status(202).json({ jobId: handle.workflowID });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unable to create job.",
      });
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const handle = DBOS.retrieveWorkflow(req.params.id);
    const status = await handle.getStatus();
    if (!status) return res.status(404).json({ error: "Job not found." });
    const payload: Record<string, unknown> = {
      jobId: req.params.id,
      status: status.status,
    };
    if (status.status === "SUCCESS") payload.result = await handle.getResult();
    if (status.status === "ERROR") payload.error = status.error;
    return res.json(payload);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to read job status." });
  }
});

app.get("/api/demo", (_req, res) =>
  res.json({
    message:
      "Delight turns any image and natural-language command into a useful result.",
  }),
);

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to the root .env file and restart npm run dev.",
    );
  }
  if (!process.env.DBOS_SYSTEM_DATABASE_URL) {
    throw new Error(
      "DBOS_SYSTEM_DATABASE_URL is missing. Add your PostgreSQL connection string to the root .env file.",
    );
  }

  DBOS.setConfig({
    name: "delight",
    applicationVersion: "0.1.0",
    systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL,
  });
  await DBOS.launch();
  app.listen(PORT, () =>
    console.log(`✨ Delight API running on http://localhost:${PORT}`),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
