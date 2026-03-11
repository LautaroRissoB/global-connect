import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'es'
  const redirect = searchParams.get('redirect') ?? '/'

  const response = NextResponse.redirect(new URL(redirect, request.url))
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  })
  return response
}
