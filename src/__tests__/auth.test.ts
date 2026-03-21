import { describe, it, expect } from 'vitest';

describe('Auth Middleware', () => {
  it('should export middleware function', async () => {
    const { middleware } = await import('../middleware');
    expect(middleware).toBeDefined();
    expect(typeof middleware).toBe('function');
  });

  it('should export config with matcher', async () => {
    const { config } = await import('../middleware');
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  it('should allow requests to /login without redirect', async () => {
    const { middleware } = await import('../middleware');
    // Create a minimal NextRequest-like object for /login
    const url = new URL('/login', 'http://localhost:3000');
    const request = {
      nextUrl: url,
      cookies: {
        get: () => undefined,
      },
    } as unknown as Parameters<typeof middleware>[0];

    const response = middleware(request);
    // /login should pass through (NextResponse.next()), not redirect
    // NextResponse.next() has no location header
    expect(response.headers.get('location')).toBeNull();
  });

  it('should redirect unauthenticated requests to /login', async () => {
    const { middleware } = await import('../middleware');
    const url = new URL('/dashboard', 'http://localhost:3000');
    const request = {
      nextUrl: url,
      url: 'http://localhost:3000/dashboard',
      cookies: {
        get: () => undefined,
      },
    } as unknown as Parameters<typeof middleware>[0];

    const response = middleware(request);
    const location = response.headers.get('location');
    expect(location).toContain('/login');
  });

  it('should allow authenticated requests', async () => {
    const { middleware } = await import('../middleware');
    const url = new URL('/dashboard', 'http://localhost:3000');
    const request = {
      nextUrl: url,
      url: 'http://localhost:3000/dashboard',
      cookies: {
        get: (name: string) =>
          name === 'seoai-auth' ? { value: 'authenticated' } : undefined,
      },
    } as unknown as Parameters<typeof middleware>[0];

    const response = middleware(request);
    expect(response.headers.get('location')).toBeNull();
  });
});
