// Vercel Edge Middleware — HTTP Basic Auth gate for the ScanCrowd demo console.
// Password is set as the DEMO_PASSWORD environment variable in the Vercel project settings.
// To change the password: update DEMO_PASSWORD in Vercel → Project → Settings → Environment Variables
// and redeploy (push to main or trigger manual deploy).

export const config = {
  matcher: ['/((?!favicon\\.svg|_vercel).*)'],
};

function unauthorized(): Response {
  return new Response('Unauthorized — ScanCrowd Demo', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="ScanCrowd Demo"',
      'Content-Type': 'text/plain',
    },
  });
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ka, kb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ka);
  const vb = new Uint8Array(kb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const password = (process.env.DEMO_PASSWORD ?? '').trim();

  // Fail closed in production when no password is set
  if (!password) {
    if (process.env.VERCEL_ENV === 'production') return unauthorized();
    return undefined; // allow through in dev/preview
  }

  const auth = request.headers.get('Authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const colon = decoded.indexOf(':');
    const given = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    if (await timingSafeEqual(given, password)) return undefined;
  }

  return unauthorized();
}
