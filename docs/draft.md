Got it — you want a **fully local MinIO Community setup** on Pop!_OS with access via **MinIO Client (`mc`)**. Here’s the cleanest, production-like way for development:

---

## **1️⃣ Run MinIO with Podman**

Create a script `scripts/run-minio.sh`:

```bash
#!/bin/bash
# Stop & remove existing container if exists
podman rm -f minio 2>/dev/null || true

# Run MinIO server
podman run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \  # Console
  -v minio-data:/data \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"

echo "MinIO running at http://localhost:9000 with console at http://localhost:9001"
echo "Access Key: minioadmin, Secret Key: minioadmin"
```

**Explanation:**

* `9000` → S3 API port
* `9001` → Web console
* `minio-data` → named Podman volume for persistent data
* Credentials are `minioadmin:minioadmin` (change in prod!)

Make it executable:

```bash
chmod +x scripts/run-minio.sh
```

Run it:

```bash
bash ./scripts/run-minio.sh
```

---

## **2️⃣ Install MinIO Client (`mc`)**

Download binary for Linux:

```bash
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/
```

Check:

```bash
mc --version
```

---

## **3️⃣ Configure `mc` to talk to your local MinIO**

```bash
mc alias set localminio http://localhost:9000 drhazem HealthF26
```

Test:

```bash
mc ls localminio
```

You should see an empty list (or buckets if previously created).

---

## **4️⃣ Create a bucket**

```bash
mc mb localminio/pedia-clinic
mc ls localminio
```

Now you can upload/download files via `mc`:

```bash
mc cp test.txt localminio/pedia-clinic/
mc ls localminio/pedia-clinic
mc rm localminio/pedia-clinic/test.txt
```

---

## **5️⃣ Optional: Add to `package.json` scripts**

```json
"scripts": {
  "minio:start": "bash ./scripts/run-minio.sh",
  "minio:mc": "mc alias set localminio http://localhost:9000 minioadmin minioadmin"
}
```

Then you can run:

```bash
bun run minio:start
bun run minio:mc
```

---

✅ **Tips for local development:**

1. Use **named volumes** (`minio-data`) so your data persists across container restarts.
2. Always use `mc` alias to avoid typing credentials each time.
3. If you want S3 SDK access, use `http://localhost:9000` with your root credentials.

---
to run redis
 sudo lsof -i :6379
  sudo systemctl stop redis  
