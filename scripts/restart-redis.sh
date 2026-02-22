#!/bin/bash

# Exit on error
set -e

CONTAINER_NAME="redis"
PORT=6379

echo "🔄 Restarting Redis container..."

# 1. Check if container exists
if [ "$(podman ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "📦 Existing container found. Attempting graceful restart..."
    podman restart $CONTAINER_NAME
else
    echo "⚠️  Redis container not found. Running full setup..."
    # If it doesn't exist, we call your existing setup script
    ./scripts/run-redis.sh # Adjust path as necessary
    exit 0
fi

# 2. Health Check Loop
echo "⏳ Waiting for health check..."
SUCCESS=false
for i in {1..5}; do
    if podman exec $CONTAINER_NAME redis-cli ping | grep -q "PONG"; then
        SUCCESS=true
        break
    fi
    echo "   ...still warming up (attempt $i/5)"
    sleep 1
done

# 3. Handle Failure (Hard Reset)
if [ "$SUCCESS" = false ]; then
    echo "❌ Graceful restart failed. Port $PORT might be hung."
    echo "🛠  Performing Hard Reset (kill & recreation)..."

    podman rm -f $CONTAINER_NAME 2>/dev/null || true

    # Use your original run logic
    podman run -d \
      --name $CONTAINER_NAME \
      -p $PORT:6379 \
      -v redis-data:/data \
      docker.io/library/redis:7-alpine \
      redis-server --appendonly yes

    echo "✅ Hard reset complete."
else
    echo "✅ Redis is back online."
fi

# 4. Optional: Show stats
echo "📊 Current Stats: $(podman exec $CONTAINER_NAME redis-cli info memory | grep 'used_memory_human')"
