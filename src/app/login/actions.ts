'use server';

import { redirect } from 'next/navigation';
import { verifyPassword, setAuthCookie } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || !verifyPassword(password)) {
    return { error: 'Invalid password' };
  }

  await setAuthCookie();
  redirect('/');
}
