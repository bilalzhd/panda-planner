"use client"
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader className="font-semibold">Welcome back</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SignIn
              afterSignInUrl="/dashboard"
              appearance={{ variables: { colorPrimary: '#ffffff' } }}
            />
            <div className="text-sm text-white/70">
              Don’t have an account?{' '}
              <Link className="underline" href="/sign-up">Create one</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
