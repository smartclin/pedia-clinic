import Image from 'next/image'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
	children: ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
	return (
		<div className='flex h-screen w-full'>
			{/* Left side: form / content */}
			<div className='flex h-full w-full items-center justify-center md:w-1/2'>
				{children}
			</div>

			<div className='relative hidden h-full md:flex md:w-1/2'>
				<Image
					alt='Smart Clinic Waiting Area with Kids'
					className='object-cover'
					fill
					priority
					src='/clinic.webp'
				/>
				<div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-black bg-opacity-40'>
					<h1 className='font-bold text-3xl text-white 2xl:text-5xl'>
						Smart Clinic
					</h1>
					<p className='text-base text-blue-500'>Your Health, Our Priority</p>
				</div>
			</div>
		</div>
	)
}

export default AuthLayout
