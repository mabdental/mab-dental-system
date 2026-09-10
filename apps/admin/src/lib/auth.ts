import { readSessionToken } from '@mab/server'

export const SESSION_COOKIE = 'mab_admin_session'

export function sessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.split(';').map((value) => value.trim()).find((value) => value.startsWith(SESSION_COOKIE + '='))
  return readSessionToken(match?.slice(SESSION_COOKIE.length + 1))
}
