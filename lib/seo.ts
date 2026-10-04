import type { Metadata } from 'next';
export const origin=process.env.SITE_URL || process.env.URL || 'https://folio-caprock-pilot.netlify.app';
export function seo(title:string,description:string,path:string,noindex=false):Metadata{return {title,description,alternates:{canonical:origin+path},openGraph:{title,description,url:origin+path,siteName:'Folio',type:'website'},twitter:{card:'summary',title,description},...(noindex?{robots:{index:false,follow:false}}:{})};}
