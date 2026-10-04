import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('work',{recursive:true});
await build({entryPoints:['lib/comparisons.ts'],outfile:'work/comparisons.mjs',bundle:true,platform:'node',format:'esm'});
const {comparisons}=await import('../work/comparisons.mjs');
const base=process.env.PILOT_URL||'https://folio-caprock-pilot.netlify.app';
const paths=['','/about','/pricing','/help','/learn','/compare','/signup','/login','/dashboard','/s/maya-chen','/s/maya-chen/p/sample-planner',...comparisons.map(c=>'/compare/'+c.slug)];
const titles=new Set();
const results=await Promise.allSettled(paths.map(async path=>{
 const response=await fetch(base+path);
 assert.equal(response.status,200,path+' renders');
 const html=await response.text();
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 assert.ok(title,path+' has a title');assert.ok(!titles.has(title),'Unique page title: '+path);titles.add(title);
 assert.ok(html.includes('name="description"'),path+' has a meta description');
 assert.ok(html.includes('property="og:title"'),path+' has Open Graph metadata');
 assert.ok(html.includes('href="'+base+path+'"')||path===''&&html.includes('href="'+base+'/"'),path+' has its canonical URL');
 if(path.startsWith('/compare/')){
  for(const type of ['Product','FAQPage','BreadcrumbList'])assert.ok(html.includes('"@type":"'+type+'"'),path+' has '+type+' structured data');
 }
 return path||'/';
}));
for(const result of results)if(result.status==='rejected')throw result.reason;
for(const path of ['/sitemap.xml','/robots.txt']){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok((await r.text()).includes(base));}
assert.equal((await fetch(base+'/compare/does-not-exist')).status,404);
console.log(JSON.stringify({rendered:results.length,comparisons:comparisons.length,metadata:true,structuredData:true,sitemap:true,robots:true,unknownPage404:true}));
