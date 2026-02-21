import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Contact | Smart Pediatric Clinic',
	description:
		'Get in touch with Smart Pediatric Clinic for inquiries or appointments.',
}

export default function ContactPage() {
	return (
		<main className='mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12'>
			<h1 className='mb-6 font-bold text-4xl text-gray-900'>Contact Us</h1>
			<p className='mb-8 text-gray-700 leading-relaxed'>
				We’d love to hear from you! Whether you have a question, feedback, or
				need assistance, our team is here to help.
			</p>

			<div className='space-y-6'>
				<div>
					<h2 className='font-semibold text-gray-900 text-lg'>
						Clinic Address
					</h2>
					<p className='text-gray-700'>123 Pediatric Ave, Hurghada, Egypt</p>
				</div>

				<div>
					<h2 className='font-semibold text-gray-900 text-lg'>Phone</h2>
					<p className='text-gray-700'>+20 103 302 2221</p>
				</div>

				<div>
					<h2 className='font-semibold text-gray-900 text-lg'>Email</h2>
					<p className='text-gray-700'>info@smartclinic.com</p>
				</div>
			</div>
		</main>
	)
}
