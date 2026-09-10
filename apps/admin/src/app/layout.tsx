import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Clinic Admin | M.A.B. Dental Clinic', template: '%s | Clinic Admin' },
  description: 'M.A.B. Dental Clinic operations workspace.',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
