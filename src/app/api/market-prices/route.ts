import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { PriceData } from "@/models";

type MarketPriceCSVRow = {
  id?: string;
  businessDate: string;
  securityId?: string;
  symbol: string;
  securityName?: string;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice?: number;
  totalTradedQuantity?: number;
  totalTradedValue?: number;
  previousDayClosePrice?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  lastUpdatedTime?: string;
  lastUpdatedPrice?: number;
  totalTrades?: number;
  averageTradedPrice?: number;
  marketCapitalization?: number;
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
  if (!s) return undefined;
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
    const businessDate = searchParams.get("businessDate");
    if (!businessDate) {
      return NextResponse.json(
        { error: "businessDate is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const startDate = parseBusinessDateToUTCStart(businessDate);
    if (!startDate) {
      return NextResponse.json(
        { error: "Invalid businessDate format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    await connectDb();

    const rows = await PriceData.find({
      date: { $gte: startDate, $lt: endDate },
    }).sort({ symbol: 1 });

    return NextResponse.json({
      businessDate,
      prices: rows.map((p) => ({
        securityId: p.securityId,
        securityName: p.securityName,
        symbol: p.symbol,
        price: p.price,
        openPrice: p.openPrice,
        previousClose: p.previousClose,
        change: p.change,
        changePercent: p.changePercent,
        high: p.high,
        low: p.low,
        volume: p.volume,
        totalTradedValue: p.totalTradedValue,
        fiftyTwoWeekHigh: p.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: p.fiftyTwoWeekLow,
        lastUpdatedTime: p.lastUpdatedTime,
        lastUpdatedPrice: p.lastUpdatedPrice,
        totalTrades: p.totalTrades,
        averageTradedPrice: p.averageTradedPrice,
        marketCapitalization: p.marketCapitalization,
        date: p.date,
      })),
    });
  } catch (error) {
    console.error("Get market prices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market prices" },
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
    const rows = body?.rows as MarketPriceCSVRow[] | undefined;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows must be a non-empty array" },
        { status: 400 }
      );
    }

    const businessDate = String(rows[0]?.businessDate || "").trim();
    const startDate = parseBusinessDateToUTCStart(businessDate);
    if (!startDate) {
      return NextResponse.json(
        { error: "Invalid Business Date in CSV. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    await connectDb();

    let success = 0;
    let failed = 0;
    const operations: any[] = [];

    for (const raw of rows) {
      const symbol = String(raw.symbol || "").trim().toUpperCase();
      const rowBusinessDate = String(raw.businessDate || "").trim();
      if (!symbol) {
        failed++;
        continue;
      }
      if (rowBusinessDate !== businessDate) {
        failed++;
        continue;
      }

      const closePrice = parseOptionalNumber(raw.closePrice);
      const previousClose = parseOptionalNumber(raw.previousDayClosePrice);
      const openPrice = parseOptionalNumber(raw.openPrice);
      const high = parseOptionalNumber(raw.highPrice);
      const low = parseOptionalNumber(raw.lowPrice);
      const totalTradedQuantity = parseOptionalNumber(raw.totalTradedQuantity);
      const totalTradedValue = parseOptionalNumber(raw.totalTradedValue);
      const fiftyTwoWeekHigh = parseOptionalNumber(raw.fiftyTwoWeekHigh);
      const fiftyTwoWeekLow = parseOptionalNumber(raw.fiftyTwoWeekLow);
      const lastUpdatedPrice = parseOptionalNumber(raw.lastUpdatedPrice);
      const totalTrades = parseOptionalNumber(raw.totalTrades);
      const averageTradedPrice = parseOptionalNumber(raw.averageTradedPrice);
      const marketCapitalization = parseOptionalNumber(raw.marketCapitalization);

      if (closePrice === undefined) {
        failed++;
        continue;
      }

      const change = previousClose !== undefined ? closePrice - previousClose : 0;
      const changePercent =
        previousClose !== undefined && previousClose !== 0
          ? (change / previousClose) * 100
          : 0;

      operations.push({
        updateOne: {
          filter: { symbol, date: { $gte: startDate, $lt: endDate } },
          update: {
            $set: {
              securityId: raw.securityId ? String(raw.securityId).trim() : undefined,
              securityName: raw.securityName
                ? String(raw.securityName).trim()
                : undefined,
              symbol,
              price: closePrice,
              openPrice,
              previousClose,
              change,
              changePercent,
              high,
              low,
              volume: totalTradedQuantity,
              totalTradedValue,
              fiftyTwoWeekHigh,
              fiftyTwoWeekLow,
              lastUpdatedTime: raw.lastUpdatedTime
                ? String(raw.lastUpdatedTime).trim()
                : undefined,
              lastUpdatedPrice,
              totalTrades,
              averageTradedPrice,
              marketCapitalization,
              date: startDate,
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
      message: `Market prices uploaded for ${businessDate}. ${success} rows saved, ${failed} skipped.`,
      businessDate,
      results: { success, failed },
    });
  } catch (error) {
    console.error("Upload market prices error:", error);
    return NextResponse.json(
      { error: "Failed to upload market prices" },
      { status: 500 }
    );
  }
}

