"use client"

import { useState, useCallback } from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, Copy, ExternalLink, AlertCircle, RotateCcw, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PartDataTable } from "@/components/part-data-table"

interface PartData {
  id: string
  name: string
  quantity: number
  position: string
  cadAssembly: string
}

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string>("")
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment")
  const [retryCount, setRetryCount] = useState(0)
  const [partData, setPartData] = useState<PartData | null>(null)
  const [isLoadingPartData, setIsLoadingPartData] = useState(false)
  const [detectedPartNumber, setDetectedPartNumber] = useState<string | null>(null)
  const { toast } = useToast()

  const detectPartNumber = (text: string): string | null => {
    const patterns =[
      /\b[A-Z]{2,4}-\d{3,4}[A-Z]?\b/g, // Primary: HL-012A, ABC-1234, AB-123B
      /\b[A-Z]{1,3}\d{3,4}[A-Z]?\b/g, // Without hyphen: HL012A, ABC1234
      /\bPN[:\s]?([A-Z0-9-]{4,12})\b/gi, // With PN prefix: PN: HL-012A
      /\bPART[:\s]?([A-Z0-9-]{4,12})\b/gi, // With PART prefix: PART: HL-012A
    ]

    console.log("[v0] Detecting part number from:", text)

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        let partNumber = matches[0]
        partNumber = partNumber.replace(/^(PN|PART)[:\s]?/gi, "").trim()
        console.log("[v0] Part number detected:", partNumber)
        return partNumber
      }
    }

    console.log("[v0] No pattern matched, using full text as part number")
    return text.trim()
  }

  const fetchPartData = async (partNumber: string) => {
    setIsLoadingPartData(true)
    setPartData(null)

    try {
      console.log("[v0] Fetching data for part number:", partNumber)
      const response = await fetch(`/api/parts/${encodeURIComponent(partNumber)}`)
      const result = await response.json()

      console.log("[v0] API response:", result)

      if (result.success && result.data) {
        setPartData(result.data)
        toast({
          title: "Part Data Found!",
          description: `Successfully loaded data for ${partNumber}`,
        })
      } else {
        toast({
          title: "Part Not Found",
          description: result.error || `No data found for part number: ${partNumber}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching part data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch part data. Please check your API configuration.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingPartData(false)
    }
  }

  const handleScan = useCallback(
    (result: any) => {
      if (result?.[0]?.rawValue && result[0].rawValue !== scannedData) {
        const scannedText = result[0].rawValue
        setScannedData(scannedText)
        setScanHistory((prev) => [scannedText, ...prev.slice(0, 4)])

        const partNumber = detectPartNumber(scannedText)
        if (partNumber) {
          setDetectedPartNumber(partNumber)
          fetchPartData(partNumber)
          toast({
            title: "QR Code Scanned!",
            description: `Detected part number: ${partNumber}`,
          })
        }
      }
    },
    [scannedData, toast],
  )

  const handleError = useCallback(
    (error: any) => {
      console.log("[v0] QR Scanner Error:", error)

      // Immediate retry with progressively simpler constraints
      if (error?.name === "OverconstrainedError") {
        console.log(`[v0] OverconstrainedError - Retry attempt: ${retryCount}`)

        if (retryCount < 3) {
          setRetryCount((prev) => prev + 1)

          // Don't show error toast on first few retries, just try again
          setTimeout(() => {
            if (isScanning) {
              setIsScanning(false)
              setTimeout(() => setIsScanning(true), 200)
            }
          }, 100)
          return
        }
      }

      // If all retries failed or other error types
      setHasPermission(false)
      setIsScanning(false)
      setRetryCount(0)

      let errorMessage = "Failed to access camera. Please check permissions and try again."
      if (error?.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please allow camera permissions."
      } else if (error?.name === "NotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (error?.name === "OverconstrainedError") {
        errorMessage = "Camera constraints not supported. Using basic camera mode."
      }

      toast({
        title: "Scanner Error",
        description: errorMessage,
        variant: "destructive",
      })
    },
    [toast, retryCount, isScanning],
  )

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())

      setHasPermission(true)
      setIsScanning(true)
      setRetryCount(0)
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
    setRetryCount(0)
  }

  const switchCamera = () => {
    const newFacing = cameraFacing === "environment" ? "user" : "environment"
    setCameraFacing(newFacing)
    setRetryCount(0)
    if (isScanning) {
      setIsScanning(false)
      setTimeout(() => setIsScanning(true), 200)
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
    switch (retryCount) {
      case 0:
        return {
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        }
      case 1:
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        }
      case 2:
        return {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
        }
      default:
        return {
          video: true,
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
                {retryCount >= 3
                  ? "Basic Mode"
                  : retryCount >= 2
                    ? "Minimal Mode"
                    : retryCount >= 1
                      ? "Standard Mode"
                      : cameraFacing === "environment"
                        ? "Back Camera"
                        : "Front Camera"}
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

      {(partData || isLoadingPartData) && <PartDataTable data={partData!} isLoading={isLoadingPartData} />}

      {/* Current Scan Result */}
      {scannedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Latest Scan
              <Badge variant="secondary">New</Badge>
              {detectedPartNumber && (
                <Badge variant="default" className="gap-1">
                  <Search className="h-3 w-3" />
                  Part: {detectedPartNumber}
                </Badge>
              )}
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
                {detectedPartNumber && (
                  <Button
                    onClick={() => fetchPartData(detectedPartNumber)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isLoadingPartData}
                  >
                    <Search className="h-4 w-4" />
                    {isLoadingPartData ? "Loading..." : "Lookup Part"}
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
