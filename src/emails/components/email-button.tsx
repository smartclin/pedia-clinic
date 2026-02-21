import { Button } from '@react-email/components'
import type { ReactNode } from 'react'

interface EmailButtonProps {
	href: string
	children: ReactNode
}

export function EmailButton({ href, children }: EmailButtonProps) {
	return (
		<Button
			className='rounded-lg bg-neutral-900 px-6 py-3 text-center font-semibold text-sm text-white no-underline'
			href={href}
		>
			{children}
		</Button>
	)
}
