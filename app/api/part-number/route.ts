import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { partNumber: string } }) {
  try {
    const { partNumber } = params

    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID
    const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1"

    console.log("[v0] Fetching data for part number:", partNumber)
    console.log("[v0] Using sheet name:", SHEET_NAME)

    if (!GOOGLE_SHEETS_API_KEY || !SPREADSHEET_ID) {
      console.error("[v0] Missing required environment variables")
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets API not configured. Please add GOOGLE_SHEETS_API_KEY and GOOGLE_SPREADSHEET_ID.",
        },
        { status: 500 },
      )
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_SHEETS_API_KEY}`
    console.log("[v0] Fetching from Google Sheets API...")

    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Google Sheets API error:", response.status, errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Google Sheets API error: ${response.status} - ${errorText}`,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] Google Sheets API response received")

    if (!data.values || data.values.length === 0) {
      console.log("[v0] No data found in sheet")
      return NextResponse.json(
        {
          success: false,
          error: "No data found in the sheet",
        },
        { status: 404 },
      )
    }

    const headers = data.values[0].map((h: string) => h.toLowerCase().trim())
    const rows = data.values.slice(1)

    console.log("[v0] Headers found:", headers)
    console.log("[v0] Total rows:", rows.length)

    const idIndex = headers.findIndex((h: string) => h === "id")
    const nameIndex = headers.findIndex((h: string) => h === "name")
    const quantityIndex = headers.findIndex((h: string) => h === "quantity")
    const positionIndex = headers.findIndex((h: string) => h === "position")
    const cadAssemblyIndex = headers.findIndex((h: string) => h === "cadassembly")

    if (idIndex === -1) {
      console.error("[v0] ID column not found in sheet")
      return NextResponse.json(
        {
          success: false,
          error: "ID column not found in sheet. Please ensure your sheet has an 'ID' column.",
        },
        { status: 500 },
      )
    }

    const matchingRow = rows.find((row: string[]) => {
      const rowId = row[idIndex]?.toString().trim().toLowerCase()
      const searchId = partNumber.trim().toLowerCase()
      return rowId === searchId
    })

    if (!matchingRow) {
      console.log("[v0] Part number not found:", partNumber)
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
