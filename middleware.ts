import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/email/test',
  '/api/invites/accept',
  '/uploads(.*)'
])

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) return
  auth().protect()
})

export const config = {
  // Recommended matcher from Clerk docs to cover pages and API
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ],
}
