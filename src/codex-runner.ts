import { spawn } from "child_process";

const TIMEOUT_MS = 120000;

export function runCodexCLI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", [
      "exec",
      "--json",
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
      prompt,
    ]);

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Codex CLI timeout"));
    }, TIMEOUT_MS);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        return reject(new Error(stderr));
      }

      resolve(stdout.trim());
    });
  });
}

/**
 * Extract a JSON object from text that may contain surrounding prose or markdown.
 * Handles cases where the model returns "Reviewing ... { ... }" or ```json { ... } ```.
 */
export function extractJSON(text: string): string {
  // 1. まずそのままパースを試みる
  try {
    JSON.parse(text);
    return text;
  } catch {
    // continue to extraction
  }

  // 2. ```json ... ``` のコードブロックからJSONを抽出
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // 3. テキスト中の最初の { ... } ブロックを抽出（ネスト対応）
  const startIdx = text.indexOf("{");
  if (startIdx !== -1) {
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      if (depth === 0) {
        const candidate = text.slice(startIdx, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          break;
        }
      }
    }
  }

  throw new Error(
    `Could not extract valid JSON from agent message: ${text.slice(0, 200)}`,
  );
}

/**
 * Parse JSONL event stream from `codex exec --json` and extract
 * the agent_message text content.
 */
export function extractAgentMessage(jsonlOutput: string): string {
  const lines = jsonlOutput.split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message"
      ) {
        return event.item.text;
      }
    } catch {
      // skip unparseable lines
    }
  }
  throw new Error("No agent_message found in Codex CLI output");
}
