import { backendOrigin, backendHeaders } from './server';
import { origin as publicOrigin } from './seo';
export async function forwardPilotRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && origin !== publicOrigin) return Response.json({error:'Request origin not allowed.'}, { status: 403 });
  }
  const headers = new Headers();
  for (const name of ['cookie', 'content-type', 'accept', 'stripe-signature']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Netlify may use an internal HTTP URL; compare with the trusted public origin.
  // The private backend independently permits this configured pilot origin.
  headers.set('origin', publicOrigin);
  const method = request.method;
  try {
    for (const [name,value] of Object.entries(backendHeaders())) headers.set(name,value);
    const upstream = await fetch(backendOrigin + url.pathname + url.search, {
      method, headers,
      body: ['GET','HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(25000),
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type','content-disposition','cache-control','x-content-type-options','retry-after']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name,value);
    }
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('set-cookie',cookie);
    // Auth, order access, and downloads must not enter a shared CDN cache.
    if (!responseHeaders.has('cache-control')) responseHeaders.set('cache-control','private, no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({error:'The store service is temporarily unavailable. Please try again.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
