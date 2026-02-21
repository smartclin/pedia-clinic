import { Heading, Text } from '@react-email/components'

import { EmailLayout } from './components/email-layout'

interface FeedbackEmailProps {
	userName: string
	userEmail: string
	category: string
	message: string
}

export default function FeedbackEmail({
	userName,
	userEmail,
	category,
	message,
}: FeedbackEmailProps) {
	return (
		<EmailLayout preview={`New feedback from ${userName}`}>
			<Heading className='mx-0 my-8 p-0 text-center font-bold text-2xl text-neutral-900'>
				New Feedback Received
			</Heading>
			<Text className='text-neutral-700 text-sm'>
				<strong>From:</strong> {userName} ({userEmail})
			</Text>
			<Text className='text-neutral-700 text-sm'>
				<strong>Category:</strong> {category}
			</Text>
			<Text className='text-neutral-700 text-sm'>
				<strong>Message:</strong>
			</Text>
			<Text className='rounded-md border border-neutral-200 bg-neutral-50 p-4 text-neutral-700 text-sm'>
				{message}
			</Text>
			<Text className='text-neutral-500 text-xs'>
				This feedback was submitted through the application feedback form.
			</Text>
		</EmailLayout>
	)
}
