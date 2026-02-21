'use client'

import { ArrowLeft, FileQuestion, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

const NotFoundPage = () => {
	const router = useRouter()

	return (
		<div className='flex min-h-screen flex-col items-center justify-center bg-background p-4'>
			<div className='max-w-xl space-y-6 text-center'>
				<FileQuestion
					className='mx-auto size-20 text-primary'
					strokeWidth={2.5}
				/>

				<h1 className='font-bold text-4xl text-foreground'>
					404 - Page Not Found
				</h1>
				<p className='text-lg text-muted-foreground'>
					Oops! It looks like the page you&apos;re looking for doesn&apos;t
					exist. Maybe it was moved or renamed?
				</p>

				<div className='flex items-center justify-center space-x-4'>
					<Button
						onClick={() => router.back()}
						variant='outline'
					>
						<ArrowLeft className='size-4' />
						Go Back
					</Button>

					<Button asChild>
						<Link href='/'>
							<Home className='size-4' />
							Return to Home
						</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}

export default NotFoundPage
