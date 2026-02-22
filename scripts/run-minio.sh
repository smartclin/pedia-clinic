#!/bin/bash
# Stop & remove existing container if exists
podman rm -f minio 2>/dev/null || true

# Run MinIO server
podman run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v minio-data:/data \
  -e MINIO_ROOT_USER=drhazem \
  -e MINIO_ROOT_PASSWORD=HealthF26 \
  quay.io/minio/minio server /data --console-address ":9001"

echo "MinIO running at http://localhost:9000 with console at http://localhost:9001"
echo "Access Key: drhazem, Secret Key: HealthF26"


mc cp scripts/test.txt localminio/pedia-clinic/
mc ls localminio/pedia-clinic
mc rm localminio/pedia-clinic/test.txt

echo "MinIO Tested successfully with mc client"
