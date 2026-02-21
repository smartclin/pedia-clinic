import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Privacy Policy | Smart Pediatric Clinic',
	description:
		'Read about how Smart Pediatric Clinic protects your privacy and data.',
}

export default function PrivacyPage() {
	return (
		<main className='mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12'>
			<h1 className='mb-6 font-bold text-4xl text-gray-900'>Privacy Policy</h1>
			<p className='mb-4 text-gray-700 leading-relaxed'>
				Your privacy is important to us. At{' '}
				<span className='font-semibold text-blue-600'>
					Smart Pediatric Clinic
				</span>
				, we are committed to protecting your personal and medical information.
			</p>
			<ul className='list-inside list-disc space-y-2 text-gray-700'>
				<li>
					We only collect information necessary for providing safe and effective
					care.
				</li>
				<li>
					Your data will never be sold or shared with unauthorized third
					parties.
				</li>
				<li>
					All sensitive information is stored securely and accessed only by
					authorized staff.
				</li>
				<li>
					You can request access, updates, or deletion of your personal data at
					any time.
				</li>
			</ul>
		</main>
	)
}
