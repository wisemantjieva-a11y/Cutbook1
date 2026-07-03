import './globals.css'

export const metadata = {
  title: 'CutBook — Barbers, Salons & House Calls in Windhoek',
  description: 'Book a barbershop or salon chair, or a mobile stylist for a house call.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
