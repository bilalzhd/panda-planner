"use client"
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const DEFAULT_REDIRECT = '/dashboard'

const getSafeRedirect = (raw: string | null) => {
  if (!raw) return DEFAULT_REDIRECT
  try {
    const parsed = decodeURIComponent(raw)
    return parsed.startsWith('/') ? parsed : DEFAULT_REDIRECT
  } catch {
    return DEFAULT_REDIRECT
  }
}

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect_url') || searchParams.get('redirectUrl')
  const redirectTarget = getSafeRedirect(redirectParam)
  const signInLink = redirectParam ? `/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}` : '/sign-in'

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader className="font-semibold">Create your account</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SignUp
              redirectUrl={redirectTarget}
              afterSignUpUrl={redirectTarget}
              appearance={{ variables: { colorPrimary: '#ffffff' } }}
            />
            <div className="text-sm text-white/70">
              Already have an account?{' '}
              <Link className="underline" href={signInLink}>Sign in</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
