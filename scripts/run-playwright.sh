#!/bin/bash
# scripts/run-playwright.sh

echo "🚀 Starting Playwright in Podman..."

# --ipc=host: Prevents Chrome from crashing in small containers
# --net=host: Allows container to see your Next.js app on localhost:3000
# --security-opt: Required for Chrome Sandboxing
podman run -it --rm \
  --name playwright-service \
  -v .:/app:Z \
  -w /app \
  --ipc=host \
  --net=host \
  --security-opt seccomp=unconfined \
  mcr.microsoft.com/playwright:v1.49.0-jammy \
  npx playwright test "$@"

echo "✅ Playwright run complete."
