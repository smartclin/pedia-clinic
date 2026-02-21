import { Heading, Text } from '@react-email/components'

import { NAME } from '@/lib/constants'

import { EmailLayout } from './components/email-layout'

interface TwoFactorEmailProps {
	name: string
	code: string
}

export default function TwoFactorEmail({ name, code }: TwoFactorEmailProps) {
	return (
		<EmailLayout preview='Your two-factor authentication code'>
			<Heading className='mx-0 my-8 p-0 text-center font-bold text-2xl text-neutral-900'>
				Two-Factor Authentication
			</Heading>
			<Text className='text-neutral-700 text-sm'>Hello {name},</Text>
			<Text className='text-neutral-700 text-sm'>
				Here's your two-factor authentication code for {NAME}:
			</Text>
			<Text className='my-4 rounded-lg bg-neutral-100 p-4 text-center font-bold text-3xl text-neutral-900 tracking-widest'>
				{code}
			</Text>
			<Text className='text-neutral-700 text-sm'>
				This code will expire in 5 minutes.
			</Text>
			<Text className='text-neutral-500 text-sm'>
				If you didn't attempt to sign in, please secure your account immediately
				by changing your password.
			</Text>
		</EmailLayout>
	)
}
