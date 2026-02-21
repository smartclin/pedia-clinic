import { TRPCError } from '@trpc/server'
import type { TRPCErrorShape } from '@trpc/server/rpc'
import type z from 'zod'
import { ZodError, type ZodType } from 'zod'

// ==================== ZOD ERROR HANDLING UTILITIES ====================

/**
 * Formats Zod validation errors for better client-side handling
 */
export function formatZodError(error: ZodError): {
	fieldErrors: Record<string, string[]>
	formErrors: string[]
	errorMap: Map<string, string[]>
} {
	const fieldErrors: Record<string, string[]> = {}
	const formErrors: string[] = []
	const errorMap = new Map<string, string[]>()
	for (const issue of error.issues) {
		const path = issue.path.join('.')
		const message = issue.message

		// Group errors by field
		if (path) {
			if (!fieldErrors[path]) {
				fieldErrors[path] = []
			}
			fieldErrors[path].push(message)
			errorMap.set(path, fieldErrors[path])
		} else {
			formErrors.push(message)
		}
	}

	return { errorMap, fieldErrors, formErrors }
}

/**
 * Creates a user-friendly TRPCError from Zod validation error
 */
export function createValidationError(
	error: ZodError,
	_context: string | undefined
): TRPCError {
	const { formErrors } = formatZodError(error)

	// const errorSummary = {
	//   message: 'Validation failed',
	//   context: context || 'Unknown',
	//   fieldErrors,
	//   formErrors,
	//   issueCount: error.issues.length
	// };

	return new TRPCError({
		cause: error,
		code: 'BAD_REQUEST',
		message: `Validation failed: ${formErrors.join(', ') || 'Please check your input'}`,
	})
}

/**
 * Enhanced error formatter for tRPC with detailed Zod error handling
 */
export function enhancedErrorFormatter({
	shape,
	error,
}: {
	shape: TRPCErrorShape
	error: TRPCError
}) {
	// Handle Zod validation errors
	if (error.cause instanceof ZodError) {
		const { fieldErrors, formErrors } = formatZodError(error.cause)

		return {
			...shape,
			data: {
				...shape.data,
				code: 'VALIDATION_ERROR',
				zodError: {
					fieldErrors,
					formErrors,
					issueCount: error.cause.issues.length,
					issues: error.cause.issues.map((issue: z.core.$ZodIssue) => ({
						code: issue.code,
						expected: 'expected' in issue ? issue.expected : undefined,
						message: issue.message,
						path: issue.path,
						received: 'received' in issue ? issue.received : undefined,
					})),
					message: error.cause.message,
				},
			},
		}
	}

	// Handle other types of errors
	if (error.cause instanceof Error) {
		return {
			...shape,
			data: {
				...shape.data,
				code: 'APPLICATION_ERROR',
				message: error.cause.message,
				stack:
					process.env.NODE_ENV === 'development'
						? error.cause.stack
						: undefined,
			},
		}
	}

	// Default error handling
	return {
		...shape,
		data: {
			...shape.data,
			code: shape.code || 'INTERNAL_SERVER_ERROR',
			message: shape.message || 'An unexpected error occurred',
		},
	}
}

/**
 * Middleware for automatic Zod error handling
 */
export function createZodValidationMiddleware() {
	return async ({ next }: { next: () => Promise<unknown> }) => {
		try {
			return await next()
		} catch (error) {
			if (error instanceof ZodError) {
				throw createValidationError(error, 'Middleware')
			}
			throw error
		}
	}
}

/**
 * Validation helper with detailed error reporting
 */
export function validateWithDetails<T>(
	schema: ZodType<T>,
	data: unknown,
	context?: string
): { success: true; data: T } | { success: false; error: TRPCError } {
	try {
		const result = schema.parse(data)
		return { data: result, success: true }
	} catch (error) {
		if (error instanceof ZodError) {
			return {
				error: createValidationError(error, context),
				success: false,
			}
		}
		throw error
	}
}

/**
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
	FUTURE_DATE: 'Date cannot be in the future',
	INVALID_DATE: 'Please enter a valid date',
	INVALID_EMAIL: 'Please enter a valid email address',
	INVALID_FORMAT: 'Please enter a valid format',
	INVALID_PHONE: 'Please enter a valid phone number',
	INVALID_RANGE: (min: number, max: number) =>
		`Must be between ${min} and ${max}`,
	INVALID_UUID: 'Please enter a valid ID',
	MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
	MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
	NON_NEGATIVE: 'Cannot be negative',
	PAST_DATE: 'Date cannot be in the past',
	POSITIVE_NUMBER: 'Must be a positive number',
	REQUIRED: 'This field is required',
	REQUIRED_IF: (condition: string) => `Required when ${condition}`,
} as const

/**
 * Field-level validation helpers
 */
export const fieldValidators = {
	date: {
		invalid_type_error: 'Must be a valid date',
		required_error: 'Date is required',
	},

	email: {
		invalid_type_error: 'Must be a valid email address',
		required_error: 'Email is required',
	},

	phone: {
		invalid_type_error: 'Must be a valid phone number',
		required_error: 'Phone number is required',
	},
	required: (fieldName: string) => ({
		required_error: `${fieldName} is required`,
	}),

	uuid: {
		invalid_type_error: 'Must be a valid ID',
		required_error: 'ID is required',
	},
} as const

/**
 * Error severity levels for client-side handling
 */
export const ERROR_SEVERITY = {
	CRITICAL: 'critical',
	HIGH: 'high',
	LOW: 'low',
	MEDIUM: 'medium',
} as const

/**
 * Categorize Zod errors by severity
 */
export function categorizeErrorSeverity(
	error: ZodError
): keyof typeof ERROR_SEVERITY {
	const hasRequiredErrors = error.issues.some(
		issue => issue.code === 'too_small'
	)
	const hasInvalidFormatErrors = error.issues.some(issue =>
		['invalid_string', 'invalid_type', 'invalid_enum_value'].includes(
			issue.code
		)
	)

	if (hasRequiredErrors) return 'HIGH'
	if (hasInvalidFormatErrors) return 'MEDIUM'
	return 'LOW'
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
	code: string,
	message: string,
	details?: string,
	severity: keyof typeof ERROR_SEVERITY = 'MEDIUM'
) {
	return {
		error: {
			code,
			details,
			message,
			severity,
			timestamp: new Date().toISOString(),
		},
		success: false,
	}
}

/**
 * Type guards for error handling
 */
export function isZodError(error: unknown): error is ZodError {
	return error instanceof ZodError
}

export function isTRPCError(error: unknown): error is TRPCError {
	return error instanceof TRPCError
}

/**
 * Async validation helper with timeout
 */
export async function validateWithTimeout<T>(
	schema: ZodType<T>,
	data: unknown,
	timeoutMs = 5000,
	context?: string
): Promise<{ success: true; data: T } | { success: false; error: TRPCError }> {
	return Promise.race([
		validateWithDetails(schema, data, context),
		new Promise<{ success: false; error: TRPCError }>(resolve =>
			setTimeout(() => {
				resolve({
					error: new TRPCError({
						code: 'TIMEOUT',
						message: 'Validation timed out',
					}),
					success: false,
				})
			}, timeoutMs)
		),
	])
}
