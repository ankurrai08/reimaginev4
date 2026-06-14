import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { RUBRIC } from "./constants";
import type { Dimensions } from "./scoring";

export interface JudgeInput {
  objectCard: string;
  lensCard: string;
  difficulty: "NORMAL" | "BOSS";
  whatItIs: string;
  aiCentral: string;
  customerService: string;
  dataLoop: string;
}

export interface JudgeResult {
  dimensions: Dimensions;
  verdict: string;
  feedback: string;
}

export class JudgeError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "JudgeError";
    this.status = status;
  }
}

// Loose schema: ask for 0–10 integers but clamp ourselves so a rare
// out-of-range value never breaks scoring.
const ScoreSchema = z.object({
  csImpact: z.number(),
  aiNative: z.number(),
  desirability: z.number(),
  strategicEdge: z.number(),
  dataMeasurability: z.number(),
  creativity: z.number(),
  verdict: z.string(),
  feedback: z.string(),
});

function clamp10(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

const SYSTEM_PROMPT = `You are the judge in "ReimaginAI", a competitive game where colleagues on a Customer Servicing Innovation team reimagine everyday objects as AI-native products. Your scoring teaches AI fluency, so every verdict must be sharp, fair, and instructive.

You will be given an everyday OBJECT, a CUSTOMER-SERVICING LENS (the angle the design must serve), the round DIFFICULTY, and the player's four-part pitch.

Score each of these six dimensions from 0 to 10 (integers):

${RUBRIC.map(
  (d) =>
    `- ${d.key} — ${d.label} (lens: ${d.lens}, weight x${d.weight}): ${d.hint}`,
).join("\n")}

Scoring principles:
- Customer Servicing Impact is the most important dimension. Reward designs that solve a real service pain or create genuine delight for the customer named in the lens.
- AI-Native Thinking is second most important. The single most common mistake is bolting AI onto an object as mere automation (a timer, a basic sensor, a generic chatbot). Reserve 8–10 for designs where modern AI capability (reasoning, personalization, prediction, perception, generation) is the CORE of why it works and could not exist without it. Score plain automation 3–5 even if well written.
- Be calibrated and use the full range. A vague or one-line answer should score low. A genuinely insightful, specific, AI-native answer should score high.
- BOSS rounds deserve the same scale but expect more ambition.

Then write:
- verdict: one punchy sentence (max ~20 words) — the headline reaction.
- feedback: 2–4 sentences of specific coaching. Always teach: name the strongest move, and give one concrete way to make it more AI-native or more customer-serving next time. Reference their actual idea, not generic advice.

Return ONLY the structured fields. Do not add commentary outside them.`;

const MODEL = "claude-opus-4-8";

export async function judge(input: JudgeInput): Promise<JudgeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new JudgeError(
      "The AI judge is not configured. Set ANTHROPIC_API_KEY and redeploy.",
      503,
    );
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `OBJECT: ${input.objectCard}
LENS: ${input.lensCard}
DIFFICULTY: ${input.difficulty}

THE PITCH
1) What it is:
${input.whatItIs}

2) How AI sits at the center:
${input.aiCentral}

3) How it serves the customer:
${input.customerService}

4) What data / feedback loop it creates:
${input.dataLoop}`;

  try {
    const response = await client.messages.parse({
      model: MODEL,
      // Generous headroom so adaptive thinking can't truncate the JSON verdict.
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(ScoreSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new JudgeError("The AI judge returned no score. Try again.", 502);
    }

    const dimensions: Dimensions = {
      csImpact: clamp10(parsed.csImpact),
      aiNative: clamp10(parsed.aiNative),
      desirability: clamp10(parsed.desirability),
      strategicEdge: clamp10(parsed.strategicEdge),
      dataMeasurability: clamp10(parsed.dataMeasurability),
      creativity: clamp10(parsed.creativity),
    };

    return {
      dimensions,
      verdict: parsed.verdict.trim() || "Scored.",
      feedback: parsed.feedback.trim(),
    };
  } catch (err) {
    if (err instanceof JudgeError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new JudgeError("The AI judge is busy. Wait a moment and resubmit.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new JudgeError(`AI judge error (${err.status}). Please retry.`, 502);
    }
    throw new JudgeError("The AI judge could not be reached. Please retry.", 502);
  }
}
