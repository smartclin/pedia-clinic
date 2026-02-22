#!/bin/bash
# scripts/run-playwright.sh

set -e

echo "🚀 Running Playwright tests..."

# 1. Check if dev server should be started
START_SERVER=false
TEST_URL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --start-server)
      START_SERVER=true
      shift
      ;;
    --url)
      TEST_URL="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# 2. Load environment variables
if [ -f .env.local ]; then
  echo "📝 Loading .env.local variables..."
  set -a
  source .env.local
  set +a
elif [ -f .env ]; then
  echo "📝 Loading .env variables..."
  set -a
  source .env
  set +a
fi

# 3. Start dev server if requested
if [ "$START_SERVER" = true ]; then
  echo "📦 Starting dev server in background..."
  bun run dev &
  DEV_SERVER_PID=$!

  # Wait for server to be ready
  echo "⏳ Waiting for dev server to be ready..."
  for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304"; then
      echo "✅ Dev server is ready!"
      break
    fi
    sleep 2
  done

  TEST_URL="${TEST_URL:-http://localhost:3000}"
fi

# 4. Set Playwright URL if provided
if [ -n "$TEST_URL" ]; then
  export PLAYWRIGHT_TEST_BASE_URL="$TEST_URL"
  echo "🎯 Using base URL: $TEST_URL"
fi

# 5. Run Playwright
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.58.2-noble"

podman run -it --rm \
  --name "playwright-$(date +%s)" \
  -v "$(pwd)":/app:Z \
  -w /app \
  --ipc=host \
  --net=host \
  --userns=keep-id \
  --security-opt seccomp=unconfined \
  -e DEBUG="${DEBUG}" \
  -e CI="${CI}" \
  -e PLAYWRIGHT_TEST_BASE_URL \
  "$PLAYWRIGHT_IMAGE" \
  /usr/bin/bash -c "bunx playwright test $*"

TEST_EXIT_CODE=$?

# 6. Cleanup dev server if started
if [ "$START_SERVER" = true ] && [ -n "$DEV_SERVER_PID" ]; then
  echo "🧹 Cleaning up dev server..."
  kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo "✅ Playwright run complete."
exit $TEST_EXIT_CODE
