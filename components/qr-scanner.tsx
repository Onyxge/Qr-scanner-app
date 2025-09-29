"use client"

import { useState, useCallback } from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, Copy, ExternalLink, AlertCircle, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string>("")
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment")
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()

  const handleScan = useCallback(
    (result: any) => {
      if (result?.[0]?.rawValue && result[0].rawValue !== scannedData) {
        const scannedText = result[0].rawValue
        setScannedData(scannedText)
        setScanHistory((prev) => [scannedText, ...prev.slice(0, 4)]) // Keep last 5 scans
        toast({
          title: "QR Code Scanned!",
          description: "Successfully scanned QR code",
        })
      }
    },
    [scannedData, toast],
  )

  const handleError = useCallback(
    (error: any) => {
      console.log("[v0] QR Scanner Error:", error)

      if (error?.name === "OverconstrainedError" && retryCount < 2) {
        console.log("[v0] Trying fallback camera configuration...")

        // First retry: switch camera
        if (retryCount === 0) {
          setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"))
          setRetryCount(1)
          toast({
            title: "Switching Camera",
            description: "Trying different camera...",
          })
          return
        }

        // Second retry: use minimal constraints
        if (retryCount === 1) {
          setRetryCount(2)
          toast({
            title: "Using Basic Camera",
            description: "Falling back to basic camera settings...",
          })
          return
        }
      }

      // If all retries failed or other error
      setHasPermission(false)
      setIsScanning(false)
      setRetryCount(0)

      let errorMessage = "Failed to access camera. Please check permissions and try again."
      if (error?.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please allow camera permissions."
      } else if (error?.name === "NotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (error?.name === "OverconstrainedError") {
        errorMessage = "Camera not compatible. Try a different device or browser."
      }

      toast({
        title: "Scanner Error",
        description: errorMessage,
        variant: "destructive",
      })
    },
    [toast, retryCount],
  )

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
      stream.getTracks().forEach((track) => track.stop()) // Stop the test stream
      setHasPermission(true)
      setIsScanning(true)
      setRetryCount(0) // Reset retry count on successful start
    } catch (error) {
      console.log("[v0] Camera permission denied:", error)
      setHasPermission(false)
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to use the QR scanner",
        variant: "destructive",
      })
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    setRetryCount(0) // Reset retry count when stopping
  }

  const switchCamera = () => {
    const newFacing = cameraFacing === "environment" ? "user" : "environment"
    setCameraFacing(newFacing)
    setRetryCount(0) // Reset retry count when manually switching
    if (isScanning) {
      setIsScanning(false)
      setTimeout(() => setIsScanning(true), 100) // Brief delay to reinitialize
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      })
    }
  }

  const openLink = (url: string) => {
    try {
      const validUrl = url.startsWith("http") ? url : `https://${url}`
      window.open(validUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Could not open the link",
        variant: "destructive",
      })
    }
  }

  const isUrl = (text: string) => {
    try {
      new URL(text.startsWith("http") ? text : `https://${text}`)
      return true
    } catch {
      return false
    }
  }

  const getConstraints = () => {
    if (retryCount >= 2) {
      // Minimal constraints as last resort
      return {
        video: true,
      }
    } else if (retryCount === 1) {
      // Basic constraints with any camera
      return {
        video: {
          width: { min: 320, ideal: 640, max: 1920 },
          height: { min: 240, ideal: 480, max: 1080 },
        },
      }
    } else {
      // Preferred constraints
      return {
        video: {
          facingMode: cameraFacing,
          width: { min: 320, ideal: 640, max: 1920 },
          height: { min: 240, ideal: 480, max: 1080 },
        },
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <div className="flex justify-center gap-3">
        <Button
          onClick={isScanning ? stopScanning : startScanning}
          variant={isScanning ? "destructive" : "default"}
          size="lg"
          className="gap-2"
        >
          {isScanning ? (
            <>
              <CameraOff className="h-5 w-5" />
              Stop Scanner
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" />
              Start Scanner
            </>
          )}
        </Button>

        {hasPermission && (
          <Button onClick={switchCamera} variant="outline" size="lg" className="gap-2 bg-transparent">
            <RotateCcw className="h-5 w-5" />
            Switch Camera
          </Button>
        )}
      </div>

      {/* Permission Warning */}
      {hasPermission === false && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Camera Access Required</p>
                <p className="text-sm text-muted-foreground">
                  Please allow camera access in your browser settings to use the QR scanner.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner */}
      {isScanning && hasPermission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              Camera View
              <Badge variant="secondary">
                {retryCount >= 2 ? "Basic Mode" : cameraFacing === "environment" ? "Back Camera" : "Front Camera"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-lg border">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={getConstraints()}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                  },
                  video: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Position the QR code within the camera view
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Scan Result */}
      {scannedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Latest Scan
              <Badge variant="secondary">New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg break-all">
                <p className="text-sm font-mono">{scannedData}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => copyToClipboard(scannedData)} variant="outline" size="sm" className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                {isUrl(scannedData) && (
                  <Button onClick={() => openLink(scannedData)} variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Link
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanHistory.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono truncate flex-1 mr-4">{scan}</p>
                  <div className="flex gap-1">
                    <Button onClick={() => copyToClipboard(scan)} variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {isUrl(scan) && (
                      <Button onClick={() => openLink(scan)} variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
