import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Folio — Your All-in-One Creator Store',description:'Turn your link in bio into a creator storefront. Publish digital downloads, courses and 1:1 bookings with Folio.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>{children}<Toaster richColors position="bottom-right"/></body></html>}
