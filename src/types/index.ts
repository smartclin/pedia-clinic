export * from './prisma-types'
export type TreeItem = string | [string, ...TreeItem[]]

export interface ErrorFallbackProps {
	error: unknown
	resetErrorBoundary: () => void
}

export class ApiError extends Error {
	readonly statusCode: number
	readonly code: string

	constructor(statusCode: number, message: string, code = 'INTERNAL_ERROR') {
		super(message)
		this.statusCode = statusCode
		this.code = code
	}
}
export type JsonValue =
	| string
	| number
	| boolean
	| { [key in string]?: JsonValue }
	| JsonValue[]
	| null

export type Decimal = { valueOf(): string }

export type Weekday =
	| 'sunday'
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'

export type TPageName =
	| 'home'
	| 'about'
	| 'contact'
	| 'services'
	| 'testimonials'
	| 'hipaa'
	| 'privacy'
	| 'terms'
