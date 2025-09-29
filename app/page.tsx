import { QRScanner } from "@/components/qr-scanner"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">QR Code Scanner</h1>
          <p className="text-muted-foreground mb-8">Point your camera at a QR code to scan it</p>
          <QRScanner />
        </div>
      </div>
    </main>
  )
}
