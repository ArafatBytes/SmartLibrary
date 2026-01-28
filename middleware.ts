import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Define Public Routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Get user session from cookie
  const sessionCookie = request.cookies.get('user_session')

  // 2. Handle Logged-in Users on Login Page
  // If user is already logged in and tries to access /login, redirect to their dashboard
  if (pathname === '/login' && sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value)
      if (session.role === 'Admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (session.role === 'Librarian') {
        return NextResponse.redirect(new URL('/librarian', request.url))
      }
    } catch (e) {
      // If cookie is invalid, ignore and allow access to login page
    }
  }

  // 3. Allow Access to Public Routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 4. Check Authentication for Protected Routes
  if (!sessionCookie) {
    // If accessing API, return 401 Unauthorized
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }
    // If accessing Pages, redirect to Login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Validate Session and Enforce Role-Based Access Control
  try {
    const session = JSON.parse(sessionCookie.value)

    // Validate role exists
    if (!session.role) {
      throw new Error('Invalid session: No role found')
    }

    // Root Path Redirect
    if (pathname === '/') {
      if (session.role === 'Admin') return NextResponse.redirect(new URL('/admin', request.url))
      if (session.role === 'Librarian') return NextResponse.redirect(new URL('/librarian', request.url))
    }

    // Protected Routes: Admin
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (session.role !== 'Admin') {
        // If API, return 403 Forbidden
        if (pathname.startsWith('/api')) {
          return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }
        // If Page, redirect to correct dashboard
        return NextResponse.redirect(new URL('/librarian', request.url))
      }
    }

    // Protected Routes: Librarian
    if (pathname.startsWith('/librarian') || pathname.startsWith('/api/librarian')) {
      if (session.role !== 'Librarian') {
        // If API, return 403 Forbidden
        if (pathname.startsWith('/api')) {
          return NextResponse.json({ error: 'Forbidden: Librarian access required' }, { status: 403 })
        }
        // If Page, redirect to correct dashboard
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }

    // Allow request to continue if all checks pass
    return NextResponse.next()

  } catch (error) {
    // Session is invalid or parsing failed
    // Clear the invalid cookie and redirect/error
    const response = pathname.startsWith('/api')
      ? NextResponse.json({ error: 'Invalid Session' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))

    response.cookies.delete('user_session')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
