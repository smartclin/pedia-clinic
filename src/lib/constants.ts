import type { Metadata } from 'next'

export const NAME = 'Smart Clinic'
export const EMAIL_URL = 'support@smartclinic.com'
export const WEBSITE_URL = 'https://smartclinic.com'
export type SiteConfig = typeof siteConfig

export const siteConfig = {
	name: 'Smart Clinic',
	description:
		'Smart Clinic is a comprehensive, modern management system designed for pediatric clinics. Built with Next.js, Tailwind CSS, and shadcn/ui for efficiency, customization, and a great user experience.',

	url: 'https://hazemibclc.com',
	links: { github: 'https://github.com/hazemibclc/pedia' },
}

import packageJson from '../../package.json'

const currentYear = new Date().getFullYear()

export const APP_CONFIG = {
	name: 'Smart Clinic',
	version: packageJson.version,
	copyright: `© ${currentYear}, Smart Clinic.`,
	meta: {
		title: 'Smart Clinic - Pediatric Clinic Management System',
		description:
			'Smart Clinic is a comprehensive, modern management system designed for pediatric clinics. Built with Next.js, Tailwind CSS, and shadcn/ui for efficiency, customization, and a great user experience.',
	},
}
export const baseMetadata: Metadata = {
	authors: [{ name: 'Smart Turbo Team' }],
	creator: 'Smart Turbo',
	description: 'Smart Turbo - Healthcare Management System',
	formatDetection: {
		address: false,
		email: false,
		telephone: false,
	},
	icons: {
		apple: '/apple-touch-icon.png',
		icon: '/favicon.ico',
		shortcut: '/favicon-16x16.png',
	},
	keywords: ['healthcare', 'clinic', 'management', 'patients', 'appointments'],
	manifest: '/site.webmanifest',
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	),
	openGraph: {
		description: 'Healthcare Management System',
		locale: 'en_US',
		siteName: 'Smart Clinic',
		title: 'Smart Clinic',
		type: 'website',
	},
	publisher: 'Smart Clinic',
	robots: {
		follow: true,
		googleBot: {
			follow: true,
			index: true,
			'max-image-preview': 'large',
			'max-snippet': -1,
			'max-video-preview': -1,
		},
		index: true,
	},
	title: {
		default: 'Smart Clinic',
		template: '%s | Smart Clinic',
	},
	twitter: {
		card: 'summary_large_image',
		description: 'Healthcare Management System',
		title: 'Smart Clinic',
	},
}

export const OAUTH_PROVIDERS = {
	GITHUB: {
		logo: '/logos/github.svg',
		name: 'GitHub',
	},
	GOOGLE: {
		logo: '/logos/google.svg',
		name: 'Google',
	},
} as const

/**
 * Password strength requirements and validation messages.
 * Used by the registration schema to enforce strong passwords.
 */
export const PASSWORD_REQUIREMENTS = {
	MESSAGES: {
		LOWERCASE: 'Must contain at least one lowercase letter',
		MIN_LENGTH: 'Password must be at least 8 characters',
		NUMBER: 'Must contain at least one number',
		UPPERCASE: 'Must contain at least one uppercase letter',
	},
	MIN_LENGTH: 8,
} as const
export const UNAUTHENTICATED_URL = '/sign-in'
export const AUTHENTICATED_URL = '/dashboard'
export const APP_NAME =
	process.env.NODE_ENV === 'development' ? 'DEV - SMARTCLINIC' : 'SmartClinic'
