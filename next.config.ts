import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	reactStrictMode: true,
	pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
	typescript: {
		ignoreBuildErrors: true,
	},
	output: 'standalone',
	cacheComponents: true,
	images: {
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		formats: ['image/avif', 'image/webp'],
		unoptimized: process.env.NODE_ENV === 'development', // dev=fast, prod=optimized
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [32, 48, 64, 96, 128, 256, 384],
		remotePatterns: [
			{ protocol: 'http', hostname: 'localhost', port: '9000' },
			{
				protocol: 'http',
				hostname: '127.0.0.1',
				port: '3000',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '**',
			},
			{
				protocol: 'http',
				hostname: '127.0.0.1',
				port: '9000',
				pathname: '/**',
			},
			{ hostname: 'placehold.co' },
			{ hostname: 'api.dicebear.com' },
			{ hostname: 'github.com' },
			{ hostname: '*.googleapis.com' },
			{ hostname: 'imagedelivery.net' },
			{ hostname: 'raw.githubusercontent.com' },
		],
	},
}

export default nextConfig
