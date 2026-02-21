import type { Service } from '@/types'

// utils/pediatric-services.ts
export const PEDIATRIC_SERVICE_RECOMMENDATIONS = [
	{
		category: 'VACCINATION',
		color: '#10b981',
		description:
			'Complete child immunization schedule including MMR, DTaP, Polio, and Hepatitis B',
		duration: 30,
		icon: 'syringe',
		isAvailable: true,
		name: 'Child Vaccination Package',
		price: 150.0,
	},
	{
		category: 'CONSULTATION',
		color: '#3b82f6',
		description:
			'Comprehensive growth assessment using WHO standards and developmental screening',
		duration: 45,
		icon: 'activity',
		isAvailable: true,
		name: 'Growth & Development Check',
		price: 80.0,
	},
	{
		category: 'LAB_TEST',
		color: '#8b5cf6',
		description: 'Complete blood count and pediatric-specific tests',
		duration: 15,
		icon: 'microscope',
		isAvailable: true,
		name: 'Pediatric Blood Test',
		price: 65.0,
	},
	{
		category: 'LAB_TEST',
		color: '#f59e0b',
		description: 'Essential screening tests for newborns',
		duration: 20,
		icon: 'baby',
		isAvailable: true,
		name: 'Newborn Screening',
		price: 120.0,
	},
]

export const getPediatricServiceStats = (services: Service[]) => {
	const pediatricServices = services.filter(
		s =>
			s.category &&
			['VACCINATION', 'CONSULTATION', 'LAB_TEST'].includes(s.category)
	)

	return {
		byCategory: {
			CONSULTATION: pediatricServices.filter(s => s.category === 'CONSULTATION')
				.length,
			LAB_TEST: pediatricServices.filter(s => s.category === 'LAB_TEST').length,
			VACCINATION: pediatricServices.filter(s => s.category === 'VACCINATION')
				.length,
		},
		pediatric: pediatricServices.length,
		percentage:
			services.length > 0
				? (pediatricServices.length / services.length) * 100
				: 0,
		total: services.length,
	}
}
