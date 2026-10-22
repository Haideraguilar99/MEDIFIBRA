import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MEDIFIBRA — Sistema de Gestión',
  description: 'Plataforma de administración de clientes y servicios de fibra óptica',
  icons: {
    icon: '/logofact.jpeg',
    apple: '/logofact.jpeg',
  },
  openGraph: {
    title: 'MEDIFIBRA S.A.S | Recordatorio de pago',
    description: 'Plataforma de administración de clientes y servicios de fibra óptica',
    images: [{ url: 'https://medifibra-filc.vercel.app/og-medifibra.png', width: 1200, height: 630, alt: 'Medifibra S.A.S' }],
    siteName: 'MEDIFIBRA — Sistema de Gestión',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
