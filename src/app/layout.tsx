import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'

import NextTopLoader from 'nextjs-toploader'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

import Header from '@/components/header'
import RootProvider from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

import { baseMetadata } from '../lib/constants'
import { geistMono, geistSans } from '../styles/fonts'

export const metadata: Metadata = baseMetadata

const loaderConfig = {
	color: '#2299DD',
	crawl: true,
	crawlSpeed: 200,
	easing: 'ease',
	height: 3,
	initialPosition: 0.08,
	shadow: '0 0 10px #2299DD,0 0 5px #2299DD',
	showAtBottom: false,
	showSpinner: false,
	speed: 200,
	zIndex: 1600,
} as const

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	minimumScale: 1,
	themeColor: '#ffffff',
}

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={cn(geistSans.variable, geistMono.variable)}
			data-scroll-behavior='smooth'
			lang='en'
			suppressHydrationWarning
		>
			<body
				className='min-h-screen overflow-x-hidden bg-background font-sans antialiased'
				suppressHydrationWarning
			>
				<RootProvider>
					<div className='relative flex min-h-screen flex-col'>
						<Header />

						<main className='flex-1'>
							<NuqsAdapter>
								<NextTopLoader {...loaderConfig} />
								{children}
							</NuqsAdapter>
						</main>

						<Toaster
							closeButton
							position='top-right'
							richColors
							theme='system'
							toastOptions={{
								className: 'border border-border',
								duration: 4000,
							}}
						/>
					</div>
				</RootProvider>
			</body>
		</html>
	)
}
