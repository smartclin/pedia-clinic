#!/bin/bash

# 1. Stop the native service if it's running (to free up port 6379)
if systemctl is-active --quiet redis; then
    echo "Stopping native Redis service to use container..."
    sudo systemctl stop redis
fi

# 2. Stop & remove existing container if exists
podman rm -f redis 2>/dev/null || true

# 3. Run Redis container with persistence
# Added --replace to ensure it takes the name properly
podman run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  docker.io/library/redis:7-alpine \
  redis-server --appendonly yes

# 4. Wait for it to actually be 'Running'
echo "Waiting for Redis container to start..."
ITER=0
while [ "$(podman inspect -f '{{.State.Running}}' redis 2>/dev/null)" != "true" ]; do
    sleep 1
    ITER=$((ITER+1))
    if [ $ITER -gt 5 ]; then
        echo "❌ Container failed to start. Port 6379 might still be blocked."
        sudo lsof -i :6379
        exit 1
    fi
done

# 5. Test Redis
echo "Testing Redis connection..."
# We use 'podman exec' for both to ensure we are talking to the CONTAINER
podman exec redis redis-cli SET pedia-test "Clinic System Ready" > /dev/null
RESULT=$(podman exec redis redis-cli GET pedia-test)

if [ "$RESULT" == "Clinic System Ready" ]; then
  podman exec redis redis-cli DEL pedia-test > /dev/null
  echo "✅ Redis container is UP and tested successfully."
else
  echo "❌ Redis test failed."
  exit 1
fi
