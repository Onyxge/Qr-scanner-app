"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, MapPin, Hash, ImageIcon } from "lucide-react"
import { useEffect, useState } from "react"

interface PartData {
  id: string
  name: string
  quantity: number
  position: string
  cadAssembly: string // Google Drive URL
}

interface PartDataTableProps {
  data: PartData
  isLoading?: boolean
}

function convertGoogleDriveUrl(url: string): string {

    

  // Convert Google Drive share URL to direct image URL
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`
  }
  return url
}

export function PartDataTable({ data, isLoading }: PartDataTableProps) {

  useEffect(() => {
        // fetch the data from google sheet
        const fetchData = async () => {
          const url = `/api/part-number`;
          try {
            const response = await fetch(url);
            const data = await response.json();   
            console.log(">>>>>>>>>>>> response >>>>>>>>>>>", data);
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
        } 
        catch (error) 
        {
            console.error("Error fetching part data:", error);
          }

        };
        fetchData();
      }
      , []);
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Loading Part Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // const imageUrl = convertGoogleDriveUrl(data.cadAssembly)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Part Information
          <Badge variant="secondary">{data?.id}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{data?.name}</h3>
          </div>

          {/* Part Details Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">ID:</span>
              <span className="font-medium">{data?.id}</span>
            </div>

            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quantity:</span>
              <Badge variant={data?.quantity > 10 ? "default" : data?.quantity > 0 ? "secondary" : "destructive"}>
                {data?.quantity}
              </Badge>
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Position:</span>
              <span className="font-medium">{data?.position}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            CAD Assembly
          </h4>

          <div className="border rounded-lg p-4 bg-muted/20">
            {imageLoading && !imageError && (
              <div className="flex items-center justify-center h-48 bg-muted rounded animate-pulse">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading image...</span>
              </div>
            )}

            {imageError ? (
              <div className="flex flex-col items-center justify-center h-48 bg-muted rounded">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-muted-foreground text-sm">Failed to load CAD image</span>
                <a
                  href={data?.cadAssembly}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm mt-2 underline"
                >
                  View in Google Drive
                </a>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={ "/placeholder.svg"}
                  alt={`CAD Assembly for ${data?.name}`}
                  className={`w-full max-w-md mx-auto rounded border ${imageLoading ? "hidden" : "block"}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false)
                    setImageError(true)
                  }}
                />
                <div className="mt-2 text-center">
                  <a
                    href={data?.cadAssembly}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Open in Google Drive
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
