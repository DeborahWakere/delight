import { DBOS } from "@dbos-inc/dbos-sdk";
import { analyzeImage } from "./agent.js";
import type { DelightResult } from "@delight/shared";

export interface DelightJobInput { imagePath: string; command: string; }

export async function analyzeStep(input: DelightJobInput): Promise<DelightResult> {
  return analyzeImage(input.imagePath, input.command);
}

export const delightWorkflow = DBOS.registerWorkflow(async (input: DelightJobInput) => {
  return DBOS.runStep(() => analyzeStep(input), { name: "analyzeImageCommand" });
}, { name: "delightWorkflow" });
