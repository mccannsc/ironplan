#!/bin/bash
# IronPlan – local dev server
# Usage: ./start.sh [port]

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IronPlan"
echo "  http://localhost:$PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to open browser
if command -v open &>/dev/null; then
  sleep 0.5 && open "http://localhost:$PORT" &
fi

cd "$DIR"
python3 -m http.server "$PORT"
