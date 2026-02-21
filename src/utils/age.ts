// src/lib/date/calculate-age.ts
export function calculateAgeFromDOB(dateOfBirth: Date, referenceDate: Date) {
	const dob = new Date(dateOfBirth)
	const ref = new Date(referenceDate)

	// Days (accurate)
	const ageDays = Math.floor(
		(ref.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24)
	)

	// Months (clinical standard: calendar months)
	let ageMonths =
		(ref.getFullYear() - dob.getFullYear()) * 12 +
		(ref.getMonth() - dob.getMonth())

	// Adjust if day not reached yet
	if (ref.getDate() < dob.getDate()) {
		ageMonths -= 1
	}

	return {
		ageDays,
		ageMonths,
	}
}

export async function calculateAgeInMonths(dateOfBirth: Date): Promise<number> {
	const today = new Date()
	const ageDays = Math.floor(
		(today.getTime() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24)
	)
	return Math.floor(ageDays / 30)
}

// export const calculateAge = (dateOfBirth: string | Date): number => {
// 	const birth = new Date(dateOfBirth)
// 	const today = new Date()
// 	let age = today.getFullYear() - birth.getFullYear()
// 	const monthDiff = today.getMonth() - birth.getMonth()
// 	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
// 		age += 1
// 	}
// 	return age
// }

export const calculateAge = (dateOfBirth: Date): string => {
	const today = new Date()
	let years = today.getFullYear() - dateOfBirth.getFullYear()
	let months = today.getMonth() - dateOfBirth.getMonth()

	if (months < 0) {
		years--
		months += 12
	}

	if (today.getDate() < dateOfBirth.getDate()) {
		months--
		if (months < 0) {
			years--
			months += 12
		}
	}

	if (years === 0) {
		return `${months}m`
	}
	return `${years}y ${months}m`
}

export function calculateAgeMonths(ageDays: number): number {
	// Calculate age in months with better precision
	return Number((ageDays / 30.4375).toFixed(2)) // Keep 2 decimal places for accuracy
}
