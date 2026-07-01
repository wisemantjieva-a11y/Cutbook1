import './globals.css'

export const metadata = {
  title: 'CutBook — Barbers & House Calls in Windhoek',
  description: 'Book a barbershop chair or a mobile barber for a house call.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
