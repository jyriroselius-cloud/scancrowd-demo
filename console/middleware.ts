// Vercel Edge Middleware — HTTP Basic Auth gate for the ScanCrowd demo console.
// Password is set as the DEMO_PASSWORD environment variable in the Vercel project settings.
// To change the password: update DEMO_PASSWORD in Vercel → Project → Settings → Environment Variables
// and redeploy (push to main or trigger manual deploy).

export const config = {
  matcher: ['/((?!favicon\\.svg|_vercel).*)'],
};

export default function middleware(request: Request): Response | undefined {
  const password = (process.env.DEMO_PASSWORD ?? '').trim();

  // If no password is configured, allow through (dev / initial deploy)
  if (!password) return undefined;

  const auth = request.headers.get('Authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    // Basic credentials are "user:password" — we only check the password half
    const colon = decoded.indexOf(':');
    const given = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    if (given === password) return undefined; // pass through to static files
  }

  return new Response('Unauthorized — ScanCrowd Demo', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="ScanCrowd Demo"',
      'Content-Type': 'text/plain',
    },
  });
}
