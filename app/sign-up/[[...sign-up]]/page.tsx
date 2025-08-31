"use client"
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader className="font-semibold">Create your account</CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SignUp
              afterSignUpUrl="/dashboard"
              appearance={{ variables: { colorPrimary: '#ffffff' } }}
            />
            <div className="text-sm text-white/70">
              Already have an account?{' '}
              <Link className="underline" href="/sign-in">Sign in</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
