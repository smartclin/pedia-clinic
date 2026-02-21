import path from 'node:path'
import 'dotenv/config'

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
	datasource: {
		url: env('DATABASE_URL'),
	},
	migrations: {
		path: path.join('prisma', 'migrations'),
		seed: 'bun run ./prisma/seed.ts',
	},
	schema: path.join('prisma', 'schema'),
})
