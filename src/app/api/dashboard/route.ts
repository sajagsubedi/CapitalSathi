import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { DailySnapshot, Portfolio, PriceData, StockHolding } from "@/models";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const userId = session?.user?._id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const portfolios = await Portfolio.find({ userId });
    const holdings = await StockHolding.find({ userId });

    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    const prices: Record<
      string,
      { price: number; change: number; changePercent: number }
    > = {};

    for (const symbol of symbols) {
      const priceData = await PriceData.findOne({ symbol }).sort({ date: -1 });
      prices[symbol] = {
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        changePercent: priceData?.changePercent || 0,
      };
    }

    let totalNetWorth = 0;
    let totalInvested = 0;
    let ipoValue = 0;
    let secondaryValue = 0;
    let ipoInvested = 0;
    let secondaryInvested = 0;

    const holdingsWithValue = holdings.map((holding) => {
      const currentPrice = prices[holding.symbol]?.price || holding.buyPrice;
      const currentValue = holding.quantity * currentPrice;
      const invested = holding.quantity * holding.buyPrice;
      const profitLoss = currentValue - invested;
      const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

      totalNetWorth += currentValue;
      totalInvested += invested;

      if (holding.type === "IPO") {
        ipoValue += currentValue;
        ipoInvested += invested;
      } else {
        secondaryValue += currentValue;
        secondaryInvested += invested;
      }

      return {
        ...holding.toObject(),
        currentPrice,
        currentValue,
        invested,
        profitLoss,
        profitLossPercent,
        priceChange: prices[holding.symbol]?.change || 0,
        priceChangePercent: prices[holding.symbol]?.changePercent || 0,
      };
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const previousSnapshot = await DailySnapshot.findOne({
      userId,
      date: { $lt: today },
    }).sort({ date: -1 });

    const dailyProfitLoss = previousSnapshot
      ? totalNetWorth - previousSnapshot.totalValue
      : 0;
    const dailyProfitLossPercent =
      previousSnapshot && previousSnapshot.totalValue > 0
        ? ((totalNetWorth - previousSnapshot.totalValue) /
            previousSnapshot.totalValue) *
          100
        : 0;

    const portfolioSummary = portfolios.map((portfolio) => {
      const portfolioHoldings = holdingsWithValue.filter(
        (h) => h.portfolioId.toString() === portfolio._id.toString()
      );
      const value = portfolioHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const invested = portfolioHoldings.reduce((sum, h) => sum + h.invested, 0);
      const profitLoss = value - invested;
      const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

      return {
        _id: portfolio._id,
        name: portfolio.name,
        type: portfolio.type,
        holdingsCount: portfolioHoldings.length,
        value,
        invested,
        profitLoss,
        profitLossPercent,
      };
    });

    const sortedByPL = [...holdingsWithValue].sort(
      (a, b) => b.profitLossPercent - a.profitLossPercent
    );
    const topGainers = sortedByPL.slice(0, 5);
    const topLosers = sortedByPL.slice(-5).reverse();

    return NextResponse.json({
      summary: {
        totalNetWorth,
        totalInvested,
        totalProfitLoss: totalNetWorth - totalInvested,
        totalProfitLossPercent:
          totalInvested > 0
            ? ((totalNetWorth - totalInvested) / totalInvested) * 100
            : 0,
        dailyProfitLoss,
        dailyProfitLossPercent,
        ipoValue,
        ipoInvested,
        ipoProfitLoss: ipoValue - ipoInvested,
        secondaryValue,
        secondaryInvested,
        secondaryProfitLoss: secondaryValue - secondaryInvested,
        totalHoldings: holdings.length,
        totalPortfolios: portfolios.length,
      },
      portfolios: portfolioSummary,
      holdings: holdingsWithValue,
      prices,
      topGainers,
      topLosers,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

