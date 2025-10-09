import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'NBA Team Selector',
    template: '%s · NBA Team Selector',
  },
  description: 'A modern Next.js application',
  openGraph: {
    title: 'NBA Team Selector',
    description: 'A modern Next.js application',
    url: '/',
    siteName: 'NBA Team Selector',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NBA Team Selector',
    description: 'A modern Next.js application',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#0b0f19',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
