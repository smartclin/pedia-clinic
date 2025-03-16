import { BsCheckCircle, BsExclamationTriangle } from 'react-icons/bs'

interface FormSuccessProps {
  message?: string
}

export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null

  return (
    <div className="flex items-center gap-x-2 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-500">
      <BsCheckCircle className="h-4 w-4" />
      <p>{message}</p>
    </div>
  )
}

interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return (
    <div className="bg-destructive/15 text-destructive flex items-center gap-x-2 rounded-md p-3 text-sm">
      <BsExclamationTriangle className="h-4 w-4" />
      <p>{message}</p>
    </div>
  )
}
