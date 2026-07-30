#!/usr/bin/env bash
# render-diagrams.sh — Batch render all .mmd files to .svg using mmdc (Mermaid CLI)
# Usage: ./render-diagrams.sh <diagrams_directory>
#
# Expects: mmdc installed globally (npm i -g @mermaid-js/mermaid-cli)
# Output: .svg file alongside each .mmd file

set -euo pipefail
shopt -s globstar nullglob

DIAGRAM_DIR="${1:?Usage: $0 <diagrams_directory>}"

if ! command -v mmdc &>/dev/null; then
  echo "ERROR: mmdc (Mermaid CLI) is not installed."
  echo "Install: npm install -g @mermaid-js/mermaid-cli"
  exit 1
fi

if [ ! -d "$DIAGRAM_DIR" ]; then
  echo "ERROR: Directory not found: $DIAGRAM_DIR"
  exit 1
fi

RENDERED=0
FAILED=0

for mmd_file in "$DIAGRAM_DIR"/*.mmd "$DIAGRAM_DIR"/**/*.mmd; do
  [ -f "$mmd_file" ] || continue

  svg_file="${mmd_file%.mmd}.svg"
  echo "Rendering: $(basename "$mmd_file") → $(basename "$svg_file")"

  if mmdc -i "$mmd_file" -o "$svg_file" --width 1400; then
    RENDERED=$((RENDERED + 1))
  else
    echo "  FAILED: $(basename "$mmd_file")"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════"
echo "  Rendered: $RENDERED"
echo "  Failed:   $FAILED"
echo "  Total:    $((RENDERED + FAILED))"
echo "═══════════════════════════════════════════"

[ "$FAILED" -eq 0 ] || exit 1
