#!/bin/bash
set -e

# Configuration
REDIS_NAME="redis"
MINIO_NAME="minio"
PLAYWRIGHT_NAME_PREFIX="playwright-service"

echo "🔄 Unified Service Restart Initiated..."

# --- 1. REDIS RESTART ---
echo "🔹 Restarting Redis..."
if [ "$(podman ps -aq -f name=^/${REDIS_NAME}$)" ]; then
    podman restart $REDIS_NAME
    echo "✅ Redis restarted."
else
    echo "⚠️ Redis container not found. Skipping (run run-redis.sh first)."
fi

# --- 2. MINIO RESTART ---
echo "🔹 Restarting MinIO..."
if [ "$(podman ps -aq -f name=^/${MINIO_NAME}$)" ]; then
    podman restart $MINIO_NAME
    # Wait for API to be ready (9000 is console, 9001 is API usually)
    sleep 2
    echo "✅ MinIO restarted."
else
    echo "⚠️ MinIO container not found."
fi

# --- 3. PLAYWRIGHT CLEANUP ---
# Playwright containers are usually ephemeral (run and die).
# We clean up any 'Exited' or 'Stale' ones to free up ports and memory.
echo "🔹 Cleaning up stale Playwright containers..."
STALE_PW=$(podman ps -aq -f "name=${PLAYWRIGHT_NAME_PREFIX}")
if [ ! -z "$STALE_PW" ]; then
    podman rm -f $STALE_PW > /dev/null
    echo "✅ Cleaned up $(echo $STALE_PW | wc -w) Playwright container(s)."
else
    echo "✅ No stale Playwright containers found."
fi

# --- 4. GLOBAL HEALTH CHECK ---
echo -e "\n📊 Service Status Summary:"
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" -f name="${REDIS_NAME}|${MINIO_NAME}"

echo -e "\n🚀 Environment is refreshed."
