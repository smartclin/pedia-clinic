import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { getRole } from '@/lib/auth/server'
import { getRoleFromSession } from '@/utils/roles'

// Separate session fetching to a component for better streaming
async function SessionHandler() {
	const session = await auth.api.getSession({ headers: await headers() })
	const userId = session?.user.id
	const role = getRoleFromSession(session)

	if (userId && role) {
		redirect(`/${role}`)
	}

	return null
}

// Loading component for better UX
function ServicesLoading() {
	return (
		<div className='flex min-h-screen items-center justify-center'>
			<LoadingSpinner />
		</div>
	)
}

// Services data for better maintainability
const PEDIATRIC_SERVICES = [
	{
		title: 'Well-Baby Checkups',
		description:
			'Comprehensive health assessments for infants and children to monitor growth and development milestones.',
		icon: '👶',
		features: [
			'Growth monitoring',
			'Developmental screening',
			'Vaccination management',
			'Nutrition guidance',
		],
	},
	{
		title: 'Vaccination Services',
		description:
			'Complete immunization schedule management with expert guidance on vaccine safety and timing.',
		icon: '💉',
		features: [
			'CDC-recommended schedule',
			'Vaccine safety counseling',
			'Immunization records',
			'Catch-up schedules',
		],
	},
	{
		title: 'Sick Visits',
		description:
			'Prompt medical attention for childhood illnesses with same-day appointments available.',
		icon: '🤒',
		features: [
			'Same-day appointments',
			'Fever management',
			'Respiratory care',
			'Gastrointestinal issues',
		],
	},
	{
		title: 'Chronic Condition Management',
		description:
			'Specialized care for children with asthma, allergies, diabetes, and other chronic conditions.',
		icon: '🩺',
		features: [
			'Asthma management',
			'Allergy treatment',
			'Diabetes care',
			'Individualized care plans',
		],
	},
	{
		title: 'Developmental Assessments',
		description:
			"Expert evaluation of your child's physical, cognitive, and emotional development.",
		icon: '📊',
		features: [
			'Milestone tracking',
			'Early intervention',
			'School readiness',
			'Behavioral assessments',
		],
	},
	{
		title: 'Emergency Care',
		description:
			'24/7 urgent care services for pediatric emergencies with specialized pediatric equipment.',
		icon: '🚑',
		features: [
			'24/7 availability',
			'Pediatric emergency specialists',
			'Child-friendly environment',
			'Family support',
		],
	},
] as const

const LACTATION_SERVICES = [
	{
		title: 'Breastfeeding Consultation',
		description:
			'One-on-one support with certified lactation consultants for successful breastfeeding journeys.',
		icon: '🤱',
		features: [
			'Latch assessment',
			'Positioning guidance',
			'Milk supply evaluation',
			'Pain management',
		],
	},
	{
		title: 'Prenatal Breastfeeding Education',
		description:
			'Comprehensive classes to prepare expectant mothers for successful breastfeeding.',
		icon: '📚',
		features: [
			'Prenatal preparation',
			'Partner education',
			'Breast anatomy',
			'Expected challenges',
		],
	},
	{
		title: 'Postpartum Support',
		description:
			'Continued support and guidance during the critical postpartum period.',
		icon: '🔄',
		features: [
			'Home visits available',
			'Weight checks',
			'Feeding schedules',
			'Maternal recovery',
		],
	},
	{
		title: 'Pumping Guidance',
		description:
			'Expert advice on breast pump selection, usage, and milk storage.',
		icon: '🍼',
		features: [
			'Pump fitting',
			'Expression techniques',
			'Milk storage guidelines',
			'Return-to-work planning',
		],
	},
	{
		title: 'Special Needs Feeding',
		description:
			'Specialized support for babies with tongue tie, cleft palate, or other feeding challenges.',
		icon: '🌟',
		features: [
			'Tongue tie assessment',
			'Specialized equipment',
			'Alternative feeding methods',
			'Medical coordination',
		],
	},
	{
		title: 'Weaning Consultation',
		description:
			'Gentle guidance for transitioning from breastfeeding to other nutrition sources.',
		icon: '🍎',
		features: [
			'Gradual weaning plans',
			'Nutritional guidance',
			'Emotional support',
			'Age-appropriate foods',
		],
	},
] as const

// Footer links for better maintainability
const FOOTER_LINKS = [
	{ href: '/about', label: 'About' },
	{ href: '/services', label: 'Services' },
	{ href: '/contact', label: 'Contact' },
	{ href: '/privacy', label: 'Privacy' },
	{ href: '/terms', label: 'Terms' },
] as const

// Main services page component
export default async function ServicesPage() {
	return (
		<Suspense fallback={<ServicesLoading />}>
			<SessionHandler />
			<ServicesContent />
		</Suspense>
	)
}

// Separate the content to make it easier to maintain
async function ServicesContent() {
	const session = await auth.api.getSession({ headers: await headers() })
	const userId = session?.user.id
	const role = session ? getRole(session) : null

	return (
		<div className='flex min-h-screen flex-col bg-linear-to-br from-blue-50 via-white to-blue-100'>
			{/* Header */}
			<header className='sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg transition-all duration-300'>
				<div className='mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8'>
					<Link
						aria-label='Smart Clinic Home'
						className='flex items-center space-x-2'
						href='/'
					>
						<div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-600'>
							<span className='font-bold text-lg text-white'>S</span>
						</div>
						<h1 className='font-bold text-2xl text-blue-700'>Smart Clinic</h1>
					</Link>

					<nav className='hidden gap-8 md:flex'>
						<Link
							className='text-gray-600 transition-colors hover:text-blue-600'
							href='/about'
							prefetch={true}
						>
							About
						</Link>
						<Link
							className='font-semibold text-blue-600 transition-colors'
							href='/services'
							prefetch={true}
						>
							Services
						</Link>
						<Link
							className='text-gray-600 transition-colors hover:text-blue-600'
							href='/contact'
							prefetch={true}
						>
							Contact
						</Link>
					</nav>

					<div className='flex items-center gap-4'>
						{userId ? (
							<Link
								href={`/${role}`}
								prefetch={true}
							>
								<Button
									aria-label='Go to Dashboard'
									className='shadow-md'
									size='sm'
								>
									Dashboard
								</Button>
							</Link>
						) : (
							<>
								<Link
									href='/auth/login'
									prefetch={true}
								>
									<Button
										aria-label='Login to account'
										className='shadow-md hover:border-blue-600 hover:text-blue-600'
										size='sm'
										variant='outline'
									>
										Login
									</Button>
								</Link>
								<Link
									href='/auth/register'
									prefetch={true}
								>
									<Button
										aria-label='Register as new patient'
										className='bg-blue-600 text-white shadow-md hover:bg-blue-700'
										size='sm'
									>
										Register
									</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='flex-1'>
				{/* Hero Section */}
				<section className='relative overflow-hidden bg-linear-to-b from-white via-blue-50/30 to-white py-16 sm:py-20 lg:py-24'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='text-center'>
							<h2 className='font-extrabold text-4xl text-gray-900 tracking-tight sm:text-5xl md:text-6xl'>
								Comprehensive Pediatric &{' '}
								<span className='bg-linear-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent'>
									Lactation Services
								</span>
							</h2>
							<p className='mx-auto mt-6 max-w-3xl text-gray-600 text-lg md:text-xl'>
								Expert care for your child&apos;s health journey, from newborn
								through adolescence, with specialized lactation support for
								breastfeeding success.
							</p>
						</div>
					</div>
				</section>

				{/* Pediatric Services Section */}
				<section className='bg-white py-16 sm:py-20'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='text-center'>
							<h3 className='font-bold text-3xl text-gray-900 sm:text-4xl'>
								Pediatric Care Services
							</h3>
							<p className='mx-auto mt-4 max-w-2xl text-gray-600 text-lg'>
								Comprehensive healthcare services tailored to meet the unique
								needs of children at every stage of development.
							</p>
						</div>

						<div className='mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
							{PEDIATRIC_SERVICES.map(service => (
								<div
									className='group rounded-2xl bg-blue-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg'
									key={service.title}
								>
									<div className='mb-4 text-4xl'>{service.icon}</div>
									<h4 className='font-semibold text-gray-900 text-xl transition-colors group-hover:text-blue-600'>
										{service.title}
									</h4>
									<p className='mt-3 text-gray-600'>{service.description}</p>
									<ul className='mt-4 space-y-2'>
										{service.features.map(feature => (
											<li
												className='flex items-center text-gray-500 text-sm'
												key={feature}
											>
												<span className='mr-2 text-blue-500'>✓</span>
												{feature}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Lactation Services Section */}
				<section className='bg-linear-to-br from-cyan-50 to-blue-50 py-16 sm:py-20'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='text-center'>
							<h3 className='font-bold text-3xl text-gray-900 sm:text-4xl'>
								Lactation Support Services
							</h3>
							<p className='mx-auto mt-4 max-w-2xl text-gray-600 text-lg'>
								Expert breastfeeding support and education to help you and your
								baby thrive.
							</p>
						</div>

						<div className='mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3'>
							{LACTATION_SERVICES.map(service => (
								<div
									className='group rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg'
									key={service.title}
								>
									<div className='mb-4 text-4xl'>{service.icon}</div>
									<h4 className='font-semibold text-gray-900 text-xl transition-colors group-hover:text-cyan-600'>
										{service.title}
									</h4>
									<p className='mt-3 text-gray-600'>{service.description}</p>
									<ul className='mt-4 space-y-2'>
										{service.features.map(feature => (
											<li
												className='flex items-center text-gray-500 text-sm'
												key={feature}
											>
												<span className='mr-2 text-cyan-500'>✓</span>
												{feature}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Call to Action Section */}
				<section className='bg-white py-16 sm:py-20'>
					<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
						<div className='text-center'>
							<h3 className='font-bold text-3xl text-gray-900 sm:text-4xl'>
								Ready to Get Started?
							</h3>
							<p className='mx-auto mt-4 max-w-2xl text-gray-600 text-lg'>
								Schedule an appointment or learn more about our comprehensive
								pediatric and lactation services.
							</p>
							<div className='mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row'>
								<Link
									href='/auth/register'
									prefetch={true}
								>
									<Button
										aria-label='Become a new patient'
										className='bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700'
										size='lg'
									>
										Become a Patient
									</Button>
								</Link>
								<Link
									href='/contact'
									prefetch={true}
								>
									<Button
										aria-label='Contact us for more information'
										className='border-2 shadow-lg transition-all hover:border-blue-600 hover:text-blue-600'
										size='lg'
										variant='outline'
									>
										Contact Us
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className='border-t bg-white/70 py-8'>
				<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
					<div className='md:flex md:items-center md:justify-between'>
						<div className='flex justify-center space-x-6 md:order-2'>
							{FOOTER_LINKS.map(link => (
								<Link
									className='text-gray-400 hover:text-gray-500'
									href={link.href}
									key={link.href}
									prefetch={true}
								>
									{link.label}
								</Link>
							))}
						</div>
						<div className='mt-8 md:order-1 md:mt-0'>
							<p className='text-center text-gray-500 text-sm'>
								&copy; {new Date().getFullYear()} Smart Pediatric Clinic. All
								rights reserved.
							</p>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
