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
