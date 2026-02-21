import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Terms & Conditions | Smart Pediatric Clinic',
	description:
		'Review the terms and conditions for using Smart Pediatric Clinic services.',
}

export default function TermsPage() {
	return (
		<main className='mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12'>
			<h1 className='mb-6 font-bold text-4xl text-gray-900'>
				Terms & Conditions
			</h1>
			<p className='mb-4 text-gray-700 leading-relaxed'>
				By using{' '}
				<span className='font-semibold text-blue-600'>
					Smart Pediatric Clinic
				</span>
				’s website and services, you agree to the following terms and
				conditions:
			</p>
			<ol className='list-inside list-decimal space-y-2 text-gray-700'>
				<li>
					Appointments booked online are subject to confirmation and
					availability.
				</li>
				<li>
					Users are responsible for providing accurate and up-to-date
					information.
				</li>
				<li>
					Smart Pediatric Clinic reserves the right to update these terms at any
					time.
				</li>
				<li>
					Use of this platform is subject to compliance with applicable
					healthcare laws.
				</li>
			</ol>
		</main>
	)
}
