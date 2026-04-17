import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { Portfolio, StockHolding } from "@/models";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const portfolioId = searchParams.get("portfolioId");

    await connectDb();

    const query: Record<string, unknown> = { userId };

    if (type && ["IPO", "Secondary"].includes(type)) {
      query.type = type;
    }

    if (portfolioId) {
      query.portfolioId = portfolioId;
    }

    const holdings = await StockHolding.find(query)
      .populate("portfolioId", "name type")
      .sort({ symbol: 1 });

    const holdingsWithPortfolio = holdings.map((holding) => ({
      ...holding.toObject(),
      portfolioName: (holding.portfolioId as unknown as { name: string })?.name,
    }));

    return NextResponse.json({ holdings: holdingsWithPortfolio });
  } catch (error) {
    console.error("Get stocks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stocks" },
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

    const { symbol, quantity, buyPrice, portfolioId, type, purchaseDate, notes } =
      await req.json();

    if (
      !symbol ||
      quantity === undefined ||
      buyPrice === undefined ||
      !portfolioId
    ) {
      return NextResponse.json(
        { error: "Symbol, quantity, buy price, and portfolio are required" },
        { status: 400 }
      );
    }

    await connectDb();

    const portfolio = await Portfolio.findOne({ _id: portfolioId, userId });
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const existingHolding = await StockHolding.findOne({
      userId,
      portfolioId,
      symbol: symbol.toUpperCase(),
    });

    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      const totalCost =
        existingHolding.quantity * existingHolding.buyPrice + quantity * buyPrice;
      const averagePrice = totalCost / totalQuantity;

      existingHolding.quantity = totalQuantity;
      existingHolding.buyPrice = averagePrice;
      await existingHolding.save();

      return NextResponse.json({ holding: existingHolding });
    }

    const holding = await StockHolding.create({
      userId,
      portfolioId,
      symbol: symbol.toUpperCase(),
      quantity,
      buyPrice,
      type: type || portfolio.type,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      notes,
    });

    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    console.error("Create stock error:", error);
    return NextResponse.json(
      { error: "Failed to create stock holding" },
      { status: 500 }
    );
  }
}

