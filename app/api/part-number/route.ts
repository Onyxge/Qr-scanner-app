import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { partNumber: string } }) {
  try {
    const { partNumber } = params

    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID
    const SHEET_NAME = process.env.SHEET_NAME || "Sheet1"

    console.log("[v0] Fetching data for part number:", partNumber)
    console.log("[v0] Using sheet name:", SHEET_NAME)

    if (!GOOGLE_SHEETS_API_KEY || !SPREADSHEET_ID) {
      const missingVars = []
      if (!GOOGLE_SHEETS_API_KEY) missingVars.push("GOOGLE_SHEETS_API_KEY")
      if (!SPREADSHEET_ID) missingVars.push("SPREADSHEET_ID")

      return NextResponse.json(
        {
          success: false,
          error: `Missing environment variables: ${missingVars.join(", ")}. Please add them in Project Settings.`,
        },
        { status: 500 },
      )
    }

    const encodedSheetName = encodeURIComponent(SHEET_NAME)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedSheetName}?key=${GOOGLE_SHEETS_API_KEY}`
    console.log("[v0] Fetching from URL:", url)

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Google Sheets API error:", response.status, errorText)

      if (response.status === 400) {
        return NextResponse.json(
          {
            success: false,
            error: `Sheet "${SHEET_NAME}" not found. Please verify the sheet name in your Google Spreadsheet matches exactly (case-sensitive). Common names: "Sheet1", "Part Assembly", etc.`,
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Google Sheets API error: ${response.status} - ${errorText}`,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] Google Sheets API response received, rows:", data.values?.length || 0)

    if (!data.values || data.values.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No data found in the sheet",
        },
        { status: 404 },
      )
    }

    const headers = data.values[0].map((h: string) => h.toLowerCase().trim().replace(/\s+/g, ""))
    const rows = data.values.slice(1)

    console.log("[v0] Headers found:", headers)
    console.log("[v0] First row sample:", rows[0])

    const idIndex = headers.findIndex((h: string) => h === "id")
    const nameIndex = headers.findIndex((h: string) => h === "name")
    const quantityIndex = headers.findIndex((h: string) => h === "quantity")
    const positionIndex = headers.findIndex((h: string) => h === "position")
    const cadAssemblyIndex = headers.findIndex((h: string) => h === "cadassembly")

    if (idIndex === -1) {
      console.error("[v0] Available headers:", data.values[0])
      return NextResponse.json(
        {
          success: false,
          error: `ID column not found. Available columns: ${data.values[0].join(", ")}`,
        },
        { status: 500 },
      )
    }

    const matchingRow = rows.find((row: string[]) => {
      const rowId = row[idIndex]?.toString().trim().toUpperCase()
      const searchId = partNumber.trim().toUpperCase()
      return rowId === searchId
    })

    if (!matchingRow) {
      console.log("[v0] Part number not found. Searched for:", partNumber)
      console.log(
        "[v0] Available IDs:",
        rows
          .map((r: string[]) => r[idIndex])
          .filter(Boolean)
          .slice(0, 5),
      )
      return NextResponse.json(
        {
          success: false,
          error: `Part number ${partNumber} not found in the sheet`,
        },
        { status: 404 },
      )
    }

    const partData = {
      id: matchingRow[idIndex] || partNumber,
      name: nameIndex !== -1 ? matchingRow[nameIndex] || "Unknown" : "Unknown",
      quantity: quantityIndex !== -1 ? Number.parseInt(matchingRow[quantityIndex] || "0") : 0,
      position: positionIndex !== -1 ? matchingRow[positionIndex] || "Unknown" : "Unknown",
      cadAssembly: cadAssemblyIndex !== -1 ? matchingRow[cadAssemblyIndex] || "" : "",
    }

    console.log("[v0] Part data found:", partData)

    return NextResponse.json({
      success: true,
      data: partData,
    })
  } catch (error) {
    console.error("[v0] Error fetching part data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch part data",
      },
      { status: 500 },
    )
  }
}
