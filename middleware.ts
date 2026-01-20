import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout']
  
  // Check if the route is public
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  // Get user session from cookie
  const sessionCookie = request.cookies.get('user_session')
  
  // Handle root path - redirect based on session
  if (pathname === '/') {
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value)
        if (session.role === 'Admin') {
          return NextResponse.redirect(new URL('/admin', request.url))
        } else if (session.role === 'Librarian') {
          return NextResponse.redirect(new URL('/librarian', request.url))
        }
      } catch {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If no session and trying to access protected route, redirect to login
  if (!sessionCookie && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Parse session if it exists
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value)
      
      // Role-based access control
      if (pathname.startsWith('/admin')) {
        // Only Admin can access /admin routes
        if (session.role !== 'Admin') {
          return NextResponse.redirect(new URL('/librarian', request.url))
        }
      } else if (pathname.startsWith('/librarian')) {
        // Only Librarian can access /librarian routes
        if (session.role !== 'Librarian') {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      }
      
      // Allow request to continue
      return NextResponse.next()
    } catch (error) {
      // Invalid session cookie, redirect to login
      if (!pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
  }
  
  return NextResponse.next()
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
