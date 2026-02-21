import { Hr, Link, Section, Text } from '@react-email/components'

import { EMAIL_URL, NAME } from '@/lib/constants'

export function EmailFooter() {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	const year = new Date().getFullYear()

	return (
		<>
			<Hr className='mx-0 my-6 w-full border border-neutral-200 border-solid' />
			<Section>
				<Text className='text-neutral-500 text-xs'>
					This email was sent by {NAME}. If you have any questions, please
					contact us at{' '}
					<Link
						className='text-neutral-700 underline'
						href={`mailto:${EMAIL_URL}`}
					>
						{EMAIL_URL}
					</Link>
					.
				</Text>
				<Text className='text-neutral-500 text-xs'>
					<Link
						className='text-neutral-700 underline'
						href={appUrl}
					>
						Visit our website
					</Link>{' '}
					|{' '}
					<Link
						className='text-neutral-700 underline'
						href={`${appUrl}/settings/notifications`}
					>
						Email preferences
					</Link>
				</Text>
				<Text className='text-neutral-500 text-xs'>
					© {year} {NAME}. All rights reserved.
				</Text>
			</Section>
		</>
	)
}
