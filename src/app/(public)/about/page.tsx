import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
	title: 'About Us | Smart Pediatric Clinic',
	description:
		'Learn more about Smart Pediatric Clinic, our commitment to pediatric health, and our core values.',
}

export default function AboutPage() {
	return (
		<main className='relative overflow-hidden bg-white py-16 sm:py-24 lg:py-32'>
			{/* Background shapes for visual interest */}
			<div
				aria-hidden='true'
				className='absolute inset-y-0 h-full w-full'
			>
				<div className='relative h-full'>
					<svg
						className='absolute right-full translate-x-1/4 translate-y-1/3 transform lg:translate-x-1/2'
						fill='none'
						height={784}
						viewBox='0 0 404 784'
						width={404}
					>
						<title>Path</title>
						<defs>
							<pattern
								height={20}
								id='svg-pattern-squares-1'
								patternUnits='userSpaceOnUse'
								width={20}
								x={0}
								y={0}
							>
								<rect
									className='text-blue-200'
									fill='currentColor'
									height={4}
									width={4}
									x={0}
									y={0}
								/>
							</pattern>
						</defs>
						<rect
							fill='url(#svg-pattern-squares-1)'
							height={784}
							width={404}
						/>
					</svg>
					<svg
						className='absolute left-full -translate-x-1/4 -translate-y-1/4 transform md:-translate-x-1/2 lg:-translate-x-3/4'
						fill='none'
						height={784}
						viewBox='0 0 404 784'
						width={404}
					>
						<title>Path</title>
						<defs>
							<pattern
								height={20}
								id='svg-pattern-squares-2'
								patternUnits='userSpaceOnUse'
								width={20}
								x={0}
								y={0}
							>
								<rect
									className='text-blue-200'
									fill='currentColor'
									height={4}
									width={4}
									x={0}
									y={0}
								/>
							</pattern>
						</defs>
						<rect
							fill='url(#svg-pattern-squares-2)'
							height={784}
							width={404}
						/>
					</svg>
				</div>
			</div>

			<div className='relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
				<div className='lg:grid lg:grid-cols-2 lg:items-center lg:gap-8'>
					{/* Text Content Section */}
					<div className='relative'>
						<h1 className='font-semibold text-base text-blue-600 uppercase tracking-wide'>
							Our Story
						</h1>
						<h2 className='mt-2 font-extrabold text-3xl text-gray-900 leading-8 tracking-tight sm:text-4xl'>
							Committed to Your Child's Health
						</h2>
						<p className='mt-4 text-gray-600 text-xl'>
							At{' '}
							<span className='font-semibold text-blue-700'>
								Smart Pediatric Clinic
							</span>
							, we are dedicated to providing compassionate, cutting-edge, and
							dependable care for children. Our mission is to empower parents
							and staff with intuitive tools that streamline healthcare
							management.
						</p>
						<div className='mt-6 space-y-6 text-gray-700'>
							<p>
								We believe that a seamless experience for families is paramount.
								From hassle-free online appointment scheduling and secure
								communication channels to instant access to comprehensive health
								records, we seamlessly integrate medical expertise with the
								latest technology. This blend ensures a modern, efficient, and
								stress-free healthcare journey for every family we serve.
							</p>
							<p>
								We are more than just a clinic; we are a partner in your child's
								growth and health, focused on creating a supportive and friendly
								environment for children and their families.
							</p>
						</div>
					</div>

					{/* Image Section */}
					<div className='relative mt-10 lg:mt-0'>
						<div className='relative h-[450px] overflow-hidden rounded-lg shadow-xl transition-transform duration-300 hover:scale-105'>
							<Image
								alt='A modern and comforting waiting area in a pediatric clinic'
								className='rounded-lg object-cover'
								fill
								src='/images/wait.webp'
							/>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
