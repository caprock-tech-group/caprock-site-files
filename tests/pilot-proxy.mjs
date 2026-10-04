import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('work',{recursive:true});
await build({entryPoints:['lib/pilot-proxy.ts'],outfile:'work/proxy-test.mjs',bundle:true,platform:'node',format:'esm'});
const { forwardPilotRequest } = await import('../work/proxy-test.mjs');
const nativeFetch=globalThis.fetch;
process.env.FOLIO_BACKEND_TOKEN='test-service-token';
let calls=[];
globalThis.fetch=async (url, options)=>{calls.push({url,options});return new Response('uploaded bytes',{headers:{'set-cookie':'folio_session=opaque; HttpOnly; SameSite=Lax; Path=/; Secure','content-type':'text/csv','cache-control':'private, no-store'}});};
try {
 const denied=await forwardPilotRequest(new Request('https://folio-caprock-pilot.netlify.app/api/store',{method:'PATCH',headers:{origin:'https://untrusted.invalid'},body:'{}'}));
 assert.equal(denied.status,403);assert.equal(calls.length,0);
 const request=new Request('https://folio-caprock-pilot.netlify.app/api/upload?kind=product',{method:'POST',headers:{origin:'https://folio-caprock-pilot.netlify.app',cookie:'folio_session=existing','content-type':'text/plain','OAI-Sites-Authorization':'Bearer untrusted-client-token'},body:'real upload payload'});
 const response=await forwardPilotRequest(request);
 assert.equal(calls[0].url,'https://folio-netlify-backend.caprocktechnology.chatgpt.site/api/upload?kind=product');
 assert.equal(calls[0].options.headers.get('cookie'),'folio_session=existing');
 assert.equal(calls[0].options.headers.get('origin'),'https://folio-caprock-pilot.netlify.app');
 assert.equal(calls[0].options.headers.get('OAI-Sites-Authorization'),'Bearer test-service-token');
 assert.equal(new TextDecoder().decode(calls[0].options.body),'real upload payload');
 assert.match(response.headers.get('set-cookie'),/HttpOnly/);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(await response.text(),'uploaded bytes');
 const internal=await forwardPilotRequest(new Request('http://localhost:3000/api/auth/register',{method:'POST',headers:{origin:'https://folio-caprock-pilot.netlify.app','content-type':'application/json'},body:'{}'}));
 assert.equal(internal.status,200,'Trusted public origin accepted despite internal runtime URL');
 globalThis.fetch=async()=>{throw new Error('service offline');};
 assert.equal((await forwardPilotRequest(new Request('https://folio-caprock-pilot.netlify.app/api/me'))).status,503);
 console.log('12 proxy security, internal URL, cookie, payload, delivery, and failure checks passed.');
} finally {globalThis.fetch=nativeFetch;}
