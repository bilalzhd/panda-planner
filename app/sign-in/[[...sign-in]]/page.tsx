"use client"
import { SignIn } from '@clerk/nextjs'
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

export default function SignInPage() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect_url') || searchParams.get('redirectUrl')
  const redirectTarget = getSafeRedirect(redirectParam)
  const signUpLink = redirectParam ? `/sign-up?redirect_url=${encodeURIComponent(redirectTarget)}` : '/sign-up'

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader className="font-semibold">Welcome back</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SignIn
              redirectUrl={redirectTarget}
              afterSignInUrl={redirectTarget}
              appearance={{ variables: { colorPrimary: '#ffffff' } }}
            />
            <div className="text-sm text-white/70">
              Don’t have an account?{' '}
              <Link className="underline" href={signUpLink}>Create one</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
