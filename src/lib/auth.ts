import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'seoai-auth';
const AUTH_COOKIE_VALUE = 'authenticated';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function verifyPassword(input: string): boolean {
  return input === process.env.AUTH_PASSWORD;
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE };
