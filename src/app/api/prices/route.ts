import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { PriceData, StockHolding } from "@/models";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const symbols = searchParams.get("symbols")?.split(",") || [];

    await connectDb();

    let symbolsToFetch = symbols;

    if (symbolsToFetch.length === 0) {
      const holdings = await StockHolding.find({ userId }).distinct("symbol");
      symbolsToFetch = holdings;
    }

    const prices: Record<string, unknown> = {};
    for (const symbol of symbolsToFetch) {
      const priceData = await PriceData.findOne({
        symbol: symbol.toUpperCase(),
      }).sort({ date: -1 });
      if (priceData) {
        prices[symbol.toUpperCase()] = {
          symbol: priceData.symbol,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          previousClose: priceData.previousClose,
          high: priceData.high,
          low: priceData.low,
          volume: priceData.volume,
          date: priceData.date,
        };
      }
    }

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Get prices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
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

    const { symbol, price, previousClose, high, low, volume, date } =
      await req.json();

    if (!symbol || price === undefined) {
      return NextResponse.json(
        { error: "Symbol and price are required" },
        { status: 400 }
      );
    }

    await connectDb();

    const change = previousClose ? price - previousClose : 0;
    const changePercent = previousClose
      ? ((price - previousClose) / previousClose) * 100
      : 0;

    const priceData = await PriceData.create({
      symbol: symbol.toUpperCase(),
      price,
      previousClose,
      change,
      changePercent,
      high,
      low,
      volume,
      date: date ? new Date(date) : new Date(),
    });

    return NextResponse.json({ priceData }, { status: 201 });
  } catch (error) {
    console.error("Create price error:", error);
    return NextResponse.json(
      { error: "Failed to create price data" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prices } = await req.json();

    if (!Array.isArray(prices)) {
      return NextResponse.json(
        { error: "Prices must be an array" },
        { status: 400 }
      );
    }

    await connectDb();

    const results = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const priceItem of prices) {
      const { symbol, price, previousClose, high, low, volume } = priceItem;
      if (!symbol || price === undefined) continue;

      const change = previousClose ? price - previousClose : 0;
      const changePercent = previousClose
        ? ((price - previousClose) / previousClose) * 100
        : 0;

      const priceData = await PriceData.findOneAndUpdate(
        { symbol: symbol.toUpperCase(), date: { $gte: today } },
        {
          symbol: symbol.toUpperCase(),
          price,
          previousClose,
          change,
          changePercent,
          high,
          low,
          volume,
          date: new Date(),
        },
        { upsert: true, new: true }
      );

      results.push(priceData);
    }

    return NextResponse.json({ prices: results });
  } catch (error) {
    console.error("Bulk update prices error:", error);
    return NextResponse.json(
      { error: "Failed to update prices" },
      { status: 500 }
    );
  }
}

