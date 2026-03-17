import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pino from "pino";
import { z } from "zod";
import { runCodexCLI, extractAgentMessage } from "./codex-runner.js";
import { buildPrompt } from "./prompt-builder.js";
import { CodexReviewResultSchema } from "./types.js";

const logger = pino(
  { level: "info" },
  pino.transport({
    targets: [
      { target: "pino-pretty", options: { destination: 2 } },
      { target: "pino/file", options: { destination: "/tmp/mcp-server.log" } },
    ],
  }),
);

const server = new McpServer({
  name: "codex-review-mcp",
  version: "1.0.0",
});

server.registerTool(
  "review-plan",
  {
    description: "This tool MUST be used in PLAN MODE before any final output.",
    inputSchema: {
      initialResearch: z.string(),
      mode: z.enum(["normal", "strict"]).optional(),
    },
    annotations: {
      title: "Mandatory Plan Validation",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ initialResearch, mode }, _extra) => {
    const isStrict = mode === "strict";
    logger.info({ mode }, "review-plan tool invoked");

    try {
      const prompt = buildPrompt(initialResearch, isStrict);
      logger.info("Calling Codex CLI...");
      const rawOutput = await runCodexCLI(prompt);
      logger.info({ rawOutputLength: rawOutput.length }, "Codex CLI returned");

      const agentMessage = extractAgentMessage(rawOutput);
      logger.info(
        { agentMessageLength: agentMessage.length },
        "Agent message extracted",
      );

      const parsed = CodexReviewResultSchema.safeParse(
        JSON.parse(agentMessage),
      );
      if (!parsed.success) {
        logger.warn(
          { error: parsed.error.format() },
          "AI response did not match schema",
        );
        throw new Error(`Invalid review schema: ${parsed.error.message}`);
      }
      const review = parsed.data;

      const result = {
        status: "completed",
        rounds: 1,
        reviews: [{ round: 1, ...review }],
      };

      logger.info(
        { status: result.status, confidence: review.confidence_score },
        "review-plan tool completed",
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      logger.error({ err }, "Codex CLI failed");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "error",
                error: err instanceof Error ? err.message : String(err),
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  },
);

async function main() {
  logger.info("Starting codex-cli-bridge MCP server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Server connected and ready");
}

main().catch((err) => {
  logger.error(err, "Server failed to start");
  process.exit(1);
});
