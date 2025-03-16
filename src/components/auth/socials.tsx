'use client'

import { FcGoogle } from 'react-icons/fc'

import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'

export function Socials() {
  const handleGoogleLogin = async () => {
    try {
      await signIn('google', {}); // Pass an empty object or any necessary options
    } catch (error) {
      console.error('Error during Google login:', error);
    }
  };

  return (
    <div className="flex w-full pr-5 pl-5">
      <Button
        onClick={handleGoogleLogin}
        variant={'outline'}
        className="w-full"
      >
        <FcGoogle /> Login with Google
      </Button>
    </div>
  )
}