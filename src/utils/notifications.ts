export function sendEmailNotification({
	to,
	subject,
	message,
}: {
	to: string
	subject: string
	message: string
}) {
	// Replace with Resend / SMTP / SendGrid later
	console.log('[EMAIL]', { message, subject, to })

	return { success: true }
}

export function sendSMSNotification({
	to,
	message,
}: {
	to: string
	message: string
}) {
	// Replace with Twilio / local SMS gateway later
	console.log('[SMS]', { message, to })

	return { success: true }
}
