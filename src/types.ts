import { z } from "zod";

export interface ReviewRequest {
  initialResearch: string;
  mode?: "normal" | "strict";
}

export const CodexReviewResultSchema = z.object({
  critical_issues: z.array(z.string()),
  missing_dependencies: z.array(z.string()),
  security_risks: z.array(z.string()),
  alternative_strategies: z.array(z.string()),
  confidence_score: z.number().int().min(0).max(100),
});

export type CodexReviewResult = z.infer<typeof CodexReviewResultSchema>;
