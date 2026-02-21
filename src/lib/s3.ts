import { S3Client } from '@aws-sdk/client-s3'

import { env } from '@/lib/env'

const globalForS3 = global as unknown as { s3: S3Client }

export const s3 =
	globalForS3.s3 ||
	new S3Client({
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
			secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
		},
		endpoint: env.S3_ENDPOINT ?? '',
		forcePathStyle: true,
		region: env.S3_REGION ?? '',
	})

if (env.NODE_ENV !== 'production') globalForS3.s3 = s3

export const S3_BUCKET = env.S3_BUCKET

export default s3
