# codex-review-mcp

MCP server for adversarial code / plan review powered by [OpenAI Codex CLI](https://github.com/openai/codex).

## Overview

**codex-review-mcp** is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides a `review-plan` tool. When invoked from an MCP client such as Claude Desktop, it delegates the review to OpenAI Codex CLI running in a read-only sandbox and returns structured JSON containing critical issues, security risks, missing dependencies, and alternative strategies.

## Features

- **Adversarial review** — acts as a senior engineer actively looking for flaws
- **Strict mode** — lowers default confidence and aggressively hunts for failure points, security gaps, and edge cases
- **Structured JSON output** — returns a well-defined schema validated with Zod
- **Read-only sandbox** — Codex CLI runs with `--sandbox read-only` for safety
- **Timeout protection** — automatically kills long-running reviews after 120 seconds

## Prerequisites

- [Docker](https://www.docker.com/)
- [OpenAI Codex CLI](https://github.com/openai/codex) configured on the host (`~/.codex`)

> **Note:** [Node.js](https://nodejs.org/) 22+ is required only if you build from source without Docker.

## Quick Start

```bash
docker pull rsaiga/codex-review-mcp
```

## Usage

### MCP Client Configuration

Add the server to your MCP client config. Example for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codex-review-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "~/.codex:/home/appuser/.codex", "rsaiga/codex-review-mcp"]
    }
  }
}
```

- `-i` keeps stdin open, which is required by MCP's StdioServerTransport.
- `-v ~/.codex:/home/appuser/.codex` mounts the host Codex CLI configuration into the container.

### Tool Parameters

The `review-plan` tool accepts the following parameters:

| Parameter         | Type                       | Required | Description                                    |
| ----------------- | -------------------------- | -------- | ---------------------------------------------- |
| `initialResearch` | `string`                   | Yes      | The code, plan, or research content to review  |
| `mode`            | `"normal"` \| `"strict"`   | No       | Review strictness (defaults to `"normal"`)     |

### Response Schema

```json
{
  "status": "completed",
  "rounds": 1,
  "reviews": [
    {
      "round": 1,
      "critical_issues": ["..."],
      "missing_dependencies": ["..."],
      "security_risks": ["..."],
      "alternative_strategies": ["..."],
      "confidence_score": 85
    }
  ]
}
```

| Field                    | Type       | Description                                  |
| ------------------------ | ---------- | -------------------------------------------- |
| `critical_issues`        | `string[]` | Critical problems found in the review target |
| `missing_dependencies`   | `string[]` | Dependencies that appear to be missing       |
| `security_risks`         | `string[]` | Identified security vulnerabilities or risks |
| `alternative_strategies` | `string[]` | Suggested alternative approaches             |
| `confidence_score`       | `integer`  | 0–100 confidence in the review assessment    |

## Build from Source

### Docker

```bash
docker build -t codex-review-mcp .
docker run -i --rm -v ~/.codex:/home/appuser/.codex codex-review-mcp
```

Or use the helper script with your MCP client config:

```json
{
  "mcpServers": {
    "codex-review-mcp": {
      "command": "/absolute/path/to/codex-review-mcp/run-docker.sh"
    }
  }
}
```

### Local (Node.js)

```bash
git clone https://github.com/RSaiga/codex-review-mcp.git
cd codex-review-mcp
npm install
npm run build
node dist/server.js
```

To use the local build with Claude Desktop:

```json
{
  "mcpServers": {
    "codex-review-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/codex-review-mcp/dist/server.js"]
    }
  }
}
```

## Project Structure

```
codex-review-mcp/
├── Dockerfile
├── LICENSE
├── README.md
├── package.json
├── run-docker.sh         # Docker実行ヘルパースクリプト
├── tsconfig.json
└── src/
    ├── server.ts          # MCP server entry point & tool registration
    ├── types.ts           # Zod schema & TypeScript types for review results
    ├── prompt-builder.ts  # Builds the adversarial review prompt
    └── codex-runner.ts    # Spawns Codex CLI and parses JSONL output
```

## License

[Apache License 2.0](LICENSE)

---

## 日本語

### 概要

**codex-review-mcp** は、OpenAI Codex CLI を利用してコードや計画に対する敵対的レビュー (adversarial review) を行う MCP サーバーです。Claude Desktop などの MCP クライアントから `review-plan` ツールとして呼び出すと、セキュリティリスク・重大な問題点・欠落依存・代替戦略を構造化 JSON で返します。

### クイックスタート

```bash
docker pull rsaiga/codex-review-mcp
```

### 使い方

Claude Desktop の `claude_desktop_config.json` に以下を追加してください:

```json
{
  "mcpServers": {
    "codex-review-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "~/.codex:/home/appuser/.codex", "rsaiga/codex-review-mcp"]
    }
  }
}
```

- `-i` は MCP の StdioServerTransport に必要です（stdin を開いたままにします）。
- `-v ~/.codex:/home/appuser/.codex` でホストの Codex CLI 設定をコンテナにマウントします。

ツールパラメータ:

- `initialResearch` (必須) — レビュー対象のコードや計画
- `mode` (任意) — `"normal"` または `"strict"`。strict モードではデフォルトの confidence_score が低く設定され、障害点・セキュリティギャップ・エッジケースをより積極的に検出します。

### ソースからビルド

Docker でローカルビルドした場合は、`run-docker.sh` を使って MCP サーバーを起動できます:

```bash
docker build -t codex-review-mcp .
```

Claude Desktop の `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codex-review-mcp": {
      "command": "/absolute/path/to/codex-review-mcp/run-docker.sh"
    }
  }
}
```

Docker を使わずにローカルでビルドする場合は Node.js 22+ が必要です。

```bash
git clone https://github.com/RSaiga/codex-review-mcp.git
cd codex-review-mcp
npm install
npm run build
node dist/server.js
```
