import type { Metadata } from "next"
import { Geist, Geist_Mono, DM_Serif_Display, Lora, Bebas_Neue, Inter } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
})

const lora = Lora({
  variable: "--font-editor",
  subsets: ["latin"],
  display: "swap",
})

const bebasNeue = Bebas_Neue({
  variable: "--font-podium",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Collab Editor — Write without limits",
  description: "Local-first collaborative document editor. Offline-capable, real-time sync, version history.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSerifDisplay.variable} ${lora.variable} ${bebasNeue.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}
