import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'M.A.B. Dental Clinic',
    template: '%s | M.A.B. Dental Clinic',
  },
  description: 'M.A.B. Dental Clinic — Your Smile is Our Masterpiece.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'M.A.B. Dental Clinic',
    description: 'Your Smile is Our Masterpiece.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
