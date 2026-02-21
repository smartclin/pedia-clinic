import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Text,
} from '@react-email/components'

interface InvitationEmailProps {
	inviterName: string
	clinicName: string
	invitationUrl: string
}

export function InvitationEmail({
	inviterName,
	clinicName,
	invitationUrl,
}: InvitationEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>You've been invited to join {clinicName}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>You've been invited!</Heading>
					<Text style={text}>
						{inviterName} has invited you to join {clinicName}.
					</Text>
					<Button
						href={invitationUrl}
						style={button}
					>
						Accept Invitation
					</Button>
					<Text style={text}>This invitation will expire in 7 days.</Text>
				</Container>
			</Body>
		</Html>
	)
}

const main = {
	backgroundColor: '#f6f9fc',
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
	backgroundColor: '#ffffff',
	margin: '0 auto',
	padding: '20px 0 48px',
	marginBottom: '64px',
}

const h1 = {
	color: '#333',
	fontSize: '24px',
	fontWeight: 'bold',
	margin: '40px 0',
	padding: '0',
}

const text = {
	color: '#333',
	fontSize: '16px',
	lineHeight: '26px',
}

const button = {
	backgroundColor: '#007ee6',
	borderRadius: '4px',
	color: '#fff',
	fontSize: '16px',
	fontWeight: 'bold',
	textDecoration: 'none',
	textAlign: 'center' as const,
	display: 'block',
	padding: '12px 24px',
	margin: '20px 0',
}
