#!/bin/bash
set -euo pipefail

CODEX_DIR="${HOME}/.codex"

exec docker run -i --rm \
  -v "${CODEX_DIR}:/home/appuser/.codex:ro" \
  codex-review-mcp