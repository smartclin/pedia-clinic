'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import { useState } from 'react'

interface AuthLayoutProps {
	children: ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
	const [imgError, setImgError] = useState(false)

	return (
		<div className='flex h-screen w-full'>
			{/* Left side: form / content */}
			<div className='flex h-full w-full items-center justify-center md:w-1/2'>
				{children}
			</div>

			{/* Right side: Image Section */}
			<div className='relative hidden md:block md:w-1/2'>
				{!imgError ? (
					<Image
						alt='Smart Clinic'
						className='z-0 object-cover'
						fill
						onError={() => {
							console.error('Failed to load /clinic.webp')
							setImgError(true)
						}}
						priority
						sizes='50vw'
						// This is the missing piece:
						src='/clinic.webp'
					/>
				) : (
					<div className='h-full w-full bg-linear-to-br from-blue-600 to-purple-700' />
				)}

				<div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40'>
					<h1 className='font-bold text-3xl text-white 2xl:text-5xl'>
						Smart Clinic
					</h1>
					<p className='font-medium text-base text-blue-400'>
						Your Health, Our Priority
					</p>
				</div>
			</div>
		</div>
	)
}
export default AuthLayout
