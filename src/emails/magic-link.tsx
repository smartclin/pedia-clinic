import { Heading, Text } from '@react-email/components'

import { NAME } from '@/lib/constants'

import { EmailButton } from './components/email-button'
import { EmailLayout } from './components/email-layout'

interface MagicLinkEmailProps {
	magicLink: string
}

export default function MagicLinkEmail({ magicLink }: MagicLinkEmailProps) {
	return (
		<EmailLayout preview='Sign in to your account'>
			<Heading className='mx-0 my-8 p-0 text-center font-bold text-2xl text-neutral-900'>
				Sign In to {NAME}
			</Heading>
			<Text className='text-neutral-700 text-sm'>
				Click the button below to sign in to your {NAME} account. This link will
				only work once.
			</Text>
			<Text className='text-center'>
				<EmailButton href={magicLink}>Sign In</EmailButton>
			</Text>
			<Text className='text-neutral-700 text-sm'>
				This link will expire in 10 minutes for security reasons.
			</Text>
			<Text className='text-neutral-500 text-sm'>
				If you didn't request this link, you can safely ignore this email.
			</Text>
		</EmailLayout>
	)
}
