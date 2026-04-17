import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { DailySnapshot, PriceData, StockHolding } from "@/models";

function toDateKeyUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "IPO" | "Secondary" | null (all)
    const days = parseInt(searchParams.get("days") || "30");

    await connectDb();

    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const startDate = addUtcDays(todayUtc, -days);
    const endDate = addUtcDays(todayUtc, 1);

    const holdings = await StockHolding.find({
      userId,
      ...(type === "IPO" || type === "Secondary" ? { type } : {}),
    });

    const symbols = [...new Set(holdings.map((h) => h.symbol))];

    const filteredSnapshots: {
      date: Date;
      value: number;
      dailyChange: number;
      dailyChangePercent: number;
    }[] = [];

    let currentIpoValue = 0;
    let currentSecondaryValue = 0;

    if (symbols.length > 0) {
      const baselineRows = await PriceData.find({
        symbol: { $in: symbols },
        date: { $lt: startDate },
      })
        .sort({ symbol: 1, date: -1 })
        .select({ symbol: 1, price: 1, date: 1 });

      const lastKnownPrices: Record<string, number> = {};
      for (const row of baselineRows) {
        if (lastKnownPrices[row.symbol] === undefined) {
          lastKnownPrices[row.symbol] = row.price || 0;
        }
      }

      const windowRows = await PriceData.find({
        symbol: { $in: symbols },
        date: { $gte: startDate, $lt: endDate },
      })
        .sort({ date: 1, symbol: 1 })
        .select({ symbol: 1, date: 1, price: 1 });

      const rowsByDateKey = new Map<string, Record<string, number>>();
      for (const row of windowRows) {
        const dateKey = toDateKeyUTC(row.date);
        const day = rowsByDateKey.get(dateKey) || {};
        day[row.symbol] = row.price || 0;
        rowsByDateKey.set(dateKey, day);
      }

      const tradingDateKeys = [...rowsByDateKey.keys()].sort();

      for (const dateKey of tradingDateKeys) {
        const dayRows = rowsByDateKey.get(dateKey);
        if (!dayRows) continue;

        for (const [symbol, price] of Object.entries(dayRows)) {
          lastKnownPrices[symbol] = price;
        }

        let value = 0;
        let ipoValue = 0;
        let secondaryValue = 0;

        for (const holding of holdings) {
          const price = lastKnownPrices[holding.symbol] ?? holding.buyPrice;
          const holdingValue = holding.quantity * price;
          value += holdingValue;
          if (holding.type === "IPO") {
            ipoValue += holdingValue;
          } else {
            secondaryValue += holdingValue;
          }
        }

        const prev = filteredSnapshots[filteredSnapshots.length - 1];
        const dailyChange = prev ? value - prev.value : 0;
        const dailyChangePercent = prev && prev.value > 0 ? (dailyChange / prev.value) * 100 : 0;

        filteredSnapshots.push({
          date: new Date(`${dateKey}T00:00:00.000Z`),
          value,
          dailyChange,
          dailyChangePercent,
        });

        if (type === null) {
          currentIpoValue = ipoValue;
          currentSecondaryValue = secondaryValue;
        }
      }
    }

    const latestSnapshot = filteredSnapshots[filteredSnapshots.length - 1];
    const firstSnapshot = filteredSnapshots[0];

    const totalGrowth =
      latestSnapshot && firstSnapshot ? latestSnapshot.value - firstSnapshot.value : 0;
    const totalGrowthPercent =
      latestSnapshot && firstSnapshot && firstSnapshot.value > 0
        ? ((latestSnapshot.value - firstSnapshot.value) / firstSnapshot.value) * 100
        : 0;

    return NextResponse.json({
      snapshots: filteredSnapshots,
      summary: {
        currentValue: latestSnapshot?.value || 0,
        ipoValue: type === "IPO" ? latestSnapshot?.value || 0 : currentIpoValue,
        secondaryValue:
          type === "Secondary" ? latestSnapshot?.value || 0 : currentSecondaryValue,
        totalGrowth,
        totalGrowthPercent,
        dailyChange: latestSnapshot?.dailyChange || 0,
        dailyChangePercent: latestSnapshot?.dailyChangePercent || 0,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const holdings = await StockHolding.find({ userId });
    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      const priceData = await PriceData.findOne({ symbol }).sort({ date: -1 });
      prices[symbol] = priceData?.price || 0;
    }

    let totalValue = 0;
    let ipoValue = 0;
    let secondaryValue = 0;
    const holdingsData = [];

    for (const holding of holdings) {
      const price = prices[holding.symbol] || holding.buyPrice;
      const value = holding.quantity * price;

      totalValue += value;
      if (holding.type === "IPO") {
        ipoValue += value;
      } else {
        secondaryValue += value;
      }

      holdingsData.push({
        symbol: holding.symbol,
        quantity: holding.quantity,
        price,
        value,
        type: holding.type,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const previousSnapshot = await DailySnapshot.findOne({
      userId,
      date: { $lt: today },
    }).sort({ date: -1 });

    const dailyChange = previousSnapshot ? totalValue - previousSnapshot.totalValue : 0;
    const dailyChangePercent =
      previousSnapshot && previousSnapshot.totalValue > 0
        ? ((totalValue - previousSnapshot.totalValue) / previousSnapshot.totalValue) * 100
        : 0;

    const snapshot = await DailySnapshot.findOneAndUpdate(
      { userId, date: { $gte: today } },
      {
        userId,
        date: new Date(),
        totalValue,
        ipoValue,
        secondaryValue,
        dailyChange,
        dailyChangePercent,
        holdings: holdingsData,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Create snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to create snapshot" },
      { status: 500 }
    );
  }
}

