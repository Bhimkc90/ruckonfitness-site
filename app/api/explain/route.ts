import { generateText, Output } from "ai";
import { DEFAULT_MODEL, MAX_OUTPUT_TOKENS, handleExplain, type GenerateFn } from "@/lib/explain/server";
import { INSTRUCTIONS, outputSchema, promptData } from "@/lib/explain/prompt";
import { memoryStore, upstashStore } from "@/lib/explain/rateLimit";

// POST /api/explain: "Explain my results". Off unless AI_EXPLAIN=enabled (server-only). Calls the model through
// Vercel AI Gateway, authenticated by AI_GATEWAY_API_KEY or, on Vercel, the project's OIDC token.

export const maxDuration = 30;

const devStore = memoryStore();

const generate: GenerateFn = async (facts, signal) => {
  const { output } = await generateText({
    model: process.env.AI_EXPLAIN_MODEL || DEFAULT_MODEL,
    instructions: INSTRUCTIONS,
    prompt: JSON.stringify(promptData(facts)),
    output: Output.object({ schema: outputSchema(facts) }),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    abortSignal: signal,
    providerOptions: {
      gateway: {
        // Route only to providers that have agreed with Vercel not to train on prompts. Zero data retention can
        // also be required (Vercel Pro or Enterprise) with AI_EXPLAIN_ZDR=required.
        disallowPromptTraining: true,
        ...(process.env.AI_EXPLAIN_ZDR === "required" ? { zeroDataRetention: true } : {}),
      },
    },
  });
  return output;
};

export async function POST(request: Request) {
  return handleExplain(request, { env: process.env, generate, store: upstashStore(process.env), devStore });
}
