import { clerkMiddleware } from '@clerk/nextjs/server'

// Public routes that do not require authentication
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/email/test',
  '/api/invites/accept',
  '/uploads(.*)',
]

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (publicRoutes.some((p) => new RegExp(`^${p}$`).test(pathname))) return

  const { userId } = auth()
  if (!userId) {
    // Redirect unauthenticated users to Sign In with return URL
    return auth().redirectToSignIn({ returnBackUrl: req.url })
  }
})

export const config = {
  // Run on all paths except static files and _next assets
  matcher: ['/((?!.*\\..*|_next).*)'],
}
