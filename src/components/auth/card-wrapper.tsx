'use client'

import { Bakcbutton } from '@/components/auth/back-button'
import { Socials } from '@/components/auth/socials'
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card'

interface CardWrapperProps {
  // eslint-disable-next-line no-undef
  children: React.ReactNode
  headerLable: string
  backButtonLable: string
  backButtonHref: string
  showSocials?: boolean
}

export function CardWrapper({
  children,
  headerLable,
  backButtonLable,
  backButtonHref,
  showSocials,
}: CardWrapperProps) {
  return (
    <Card className="flex w-[400px] flex-col gap-y-2 shadow-md">
      <CardTitle className="pt-5 pl-5">{headerLable}</CardTitle>
      <CardContent>{children} </CardContent>
      <p className="flex w-full justify-center text-sm">
        {' '}
        or login with google
      </p>
      {showSocials && <Socials />}
      <CardFooter className="pt-5 pl-5">
        {' '}
        <Bakcbutton lable={backButtonLable} href={backButtonHref} />{' '}
      </CardFooter>
    </Card>
  )
}
