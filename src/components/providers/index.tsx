import type { PropsWithChildren } from 'react'

import { AuthProvider } from '@/components/providers/auth-provider'
import ThemeProvider from '@/components/providers/theme-provider'

import { ThemeToastContainer } from './toast-container'
import TrpcProvider from './trpc-provider'

type TRootProvider = PropsWithChildren

export default function RootProvider({ children }: Readonly<TRootProvider>) {
	return (
		<TrpcProvider>
			<AuthProvider auth={{ user: null, session: null }}>
				<ThemeProvider>{children}</ThemeProvider>
				<ThemeToastContainer />
			</AuthProvider>
		</TrpcProvider>
	)
}
