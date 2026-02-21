import { db } from '../server/db'

interface DoseGuideline {
	minDose?: number | null
	maxDose?: number | null
	minDosePerKg?: number | null
	maxDosePerKg?: number | null
	doseUnit?: string | null
}

interface PrescriptionItem {
	drugId: string
	dosageValue: number
	dosageUnit: string
}

export async function validateDoseAgainstGuidelines(
	item: PrescriptionItem,
	guidelines: DoseGuideline[],
	patientId: string
) {
	if (!guidelines.length) {
		return
	}

	const guideline = guidelines.find(g => g.doseUnit === item.dosageUnit)
	if (!guideline) {
		return
	}

	// Load patient weight (latest)
	const vitals = await db.vitalSigns.findFirst({
		include: {
			growthRecords: {
				select: {
					height: true,
					weight: true,
				},
			},
		},
		orderBy: { recordedAt: 'desc' },
		where: { growthRecords: { some: { weight: { not: null } } }, patientId },
	})

	const weightKg = vitals?.growthRecords[0]?.weight ?? null

	// --- Fixed dose validation ---
	if (
		(guideline.minDose != null && item.dosageValue < guideline.minDose) ||
		(guideline.maxDose != null && item.dosageValue > guideline.maxDose)
	) {
		throw new Error(
			`Dose ${item.dosageValue}${item.dosageUnit} is outside recommended fixed range`
		)
	}

	// --- Weight-based validation (mg/kg) ---
	if (weightKg != null) {
		const dosePerKg = item.dosageValue / weightKg

		if (
			(guideline.minDosePerKg != null && dosePerKg < guideline.minDosePerKg) ||
			(guideline.maxDosePerKg != null && dosePerKg > guideline.maxDosePerKg)
		) {
			throw new Error(
				`Dose equals ${dosePerKg.toFixed(2)}${item.dosageUnit}/kg, outside safe pediatric range`
			)
		}
	}
}
