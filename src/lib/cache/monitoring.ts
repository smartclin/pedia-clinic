/**
 * 📊 Cache Hit Rate Tracking
 * Following BEST_PRACTICES.md - Monitor cache performance
 */

interface CacheStats {
	hits: number
	misses: number
	totalTime: number
	operations: number
}

const cacheStats = new Map<string, CacheStats>()

export function trackCacheAccess(
	tag: string,
	hit: boolean,
	durationMs: number
) {
	const stats = cacheStats.get(tag) || {
		hits: 0,
		misses: 0,
		operations: 0,
		totalTime: 0,
	}

	if (hit) {
		stats.hits++
	} else {
		stats.misses++
	}

	stats.totalTime += durationMs
	stats.operations++

	cacheStats.set(tag, stats)
}

export function getCacheStats() {
	const stats = Array.from(cacheStats.entries()).map(([tag, data]) => ({
		avgResponseTime: data.totalTime / data.operations,
		hitRate: (data.hits / (data.hits + data.misses || 1)) * 100,
		hits: data.hits,
		misses: data.misses,
		tag,
		totalOperations: data.operations,
	}))

	return stats.sort((a, b) => b.hitRate - a.hitRate)
}

export function resetCacheStats() {
	cacheStats.clear()
}

// Export for API endpoint
export const cacheMonitoring = {
	getStats: getCacheStats,
	reset: resetCacheStats,
	trackAccess: trackCacheAccess,
}
