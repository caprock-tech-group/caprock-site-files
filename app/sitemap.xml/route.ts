import {origin} from '@/lib/seo';
import {comparisons} from '@/lib/comparisons';
import {articles} from '@/lib/articles';
export const dynamic='force-dynamic';
export async function GET(){
 const paths=['','/about','/pricing','/help','/learn','/compare','/s/maya-chen',...comparisons.map(c=>'/compare/'+c.slug),...articles.map(a=>'/learn/'+a.slug)];
 const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+origin+p+'</loc></url>').join('')+'</urlset>';
 return new Response(xml,{headers:{'Content-Type':'application/xml','Cache-Control':'public, max-age=300'}});
}
