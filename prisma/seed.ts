import 'dotenv/config'

import { prisma } from '../src/server/db'
import baseSeed from './seed/seed'
import drugSeed from './seed/seed-drugs'
import wfaSeed from './seed/seed-wfa'

export type PrismaSeedClient = typeof prisma
/**
 * Master seed runner
 */
async function runAllSeeds(prisma: PrismaSeedClient) {
	console.log('🚀 Starting Master Seeding Orchestration...\n')

	await baseSeed(prisma)
	console.log('✅ Base Data (Clinic / Faker) Seeded')
	console.log('--------------------------------------------------')

	await drugSeed(prisma)
	console.log('✅ NICU Drug Database Seeded')
	console.log('--------------------------------------------------')

	await wfaSeed(prisma)
	console.log('✅ WHO WFA (JSON) Seeded')
	console.log('--------------------------------------------------')

	console.log('🎉 All seeds completed successfully!')
}
/**
 * Top-level execution (Node / Bun / pnpm safe)
 */
;(async () => {
	try {
		await runAllSeeds(prisma)
	} catch (error) {
		console.error('❌ Master Seeding failed:', error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
})()
