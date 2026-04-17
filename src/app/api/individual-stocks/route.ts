import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { PriceData } from "@/models";

type IndividualStockCSVRow = {
  symbol: string;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  percentChange?: number;
  volume?: number;
  turnover?: number;
};

function parseBusinessDateToUTCStart(businessDate: string): Date | null {
  const match = businessDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const s = String(value).trim();
  if (!s || s === "-") return undefined;
  const normalized = s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const symbol = String(searchParams.get("symbol") || "").trim().toUpperCase();
    const limit = Math.min(Number(searchParams.get("limit") || 120), 500);

    if (!symbol) {
      return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    await connectDb();

    const rows = await PriceData.find({ symbol }).sort({ date: -1 }).limit(limit);
    const latest = rows[0];

    return NextResponse.json({
      symbol,
      latest: latest
        ? {
            securityName: latest.securityName,
            price: latest.price,
            previousClose: latest.previousClose,
            change: latest.change,
            changePercent: latest.changePercent,
            high: latest.high,
            low: latest.low,
            volume: latest.volume,
            marketCapitalization: latest.marketCapitalization,
            date: latest.date,
          }
        : null,
      prices: rows.map((p) => ({
        date: p.date,
        open: p.openPrice,
        high: p.high,
        low: p.low,
        close: p.price,
        previousClose: p.previousClose,
        change: p.change,
        changePercent: p.changePercent,
        volume: p.volume,
        turnover: p.totalTradedValue,
      })),
    });
  } catch (error) {
    console.error("Get individual stock error:", error);
    return NextResponse.json(
      { error: "Failed to fetch individual stock data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rows = body?.rows as IndividualStockCSVRow[] | undefined;
    const requestedSymbol = String(body?.symbol || "").trim().toUpperCase();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows must be a non-empty array" },
        { status: 400 }
      );
    }

    await connectDb();

    const operations: any[] = [];
    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const symbol = String(row.symbol || "").trim().toUpperCase();
      if (!symbol) {
        failed++;
        continue;
      }
      if (requestedSymbol && symbol !== requestedSymbol) {
        continue;
      }

      const startDate = parseBusinessDateToUTCStart(String(row.date || "").trim());
      if (!startDate) {
        failed++;
        continue;
      }
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);

      const close = parseOptionalNumber(row.close);
      if (close === undefined) {
        failed++;
        continue;
      }

      const open = parseOptionalNumber(row.open);
      const high = parseOptionalNumber(row.high);
      const low = parseOptionalNumber(row.low);
      const volume = parseOptionalNumber(row.volume);
      const turnover = parseOptionalNumber(row.turnover);
      const changePercent = parseOptionalNumber(row.percentChange);
      const previousClose =
        changePercent !== undefined && changePercent !== -100
          ? close / (1 + changePercent / 100)
          : undefined;
      const change = previousClose !== undefined ? close - previousClose : undefined;

      operations.push({
        updateOne: {
          filter: { symbol, date: { $gte: startDate, $lt: endDate } },
          update: {
            $set: {
              symbol,
              date: startDate,
              price: close,
              openPrice: open,
              high,
              low,
              previousClose,
              change,
              changePercent,
              volume,
              totalTradedValue: turnover,
            },
          },
          upsert: true,
        },
      });
      success++;
    }

    if (operations.length === 0) {
      return NextResponse.json({ error: "No valid rows to upload" }, { status: 400 });
    }

    await PriceData.bulkWrite(operations, { ordered: false });

    return NextResponse.json({
      message: "Individual stock prices uploaded successfully",
      results: { success, failed },
      symbol: requestedSymbol || null,
    });
  } catch (error) {
    console.error("Upload individual stock error:", error);
    return NextResponse.json(
      { error: "Failed to upload individual stock data" },
      { status: 500 }
    );
  }
}

