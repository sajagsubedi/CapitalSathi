import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { Portfolio, StockHolding } from "@/models";

interface CSVRow {
  symbol: string;
  quantity: number;
  portfolio: string;
  buyPrice?: number;
  type?: "IPO" | "Secondary";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, type = "IPO" } = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Data must be a non-empty array" },
        { status: 400 }
      );
    }

    await connectDb();

    const portfolios = await Portfolio.find({ userId });
    const portfolioMap = new Map(portfolios.map((p) => [p.name.toLowerCase(), p]));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as string[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as CSVRow;
      const rowNum = i + 1;

      if (!row.symbol) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: Missing symbol`);
        continue;
      }

      if (!row.quantity || isNaN(Number(row.quantity))) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: Invalid quantity`);
        continue;
      }

      if (!row.portfolio) {
        results.failed++;
        results.errors.push(`Row ${rowNum}: Missing portfolio name`);
        continue;
      }

      const quantity = Number(row.quantity);
      const buyPrice = row.buyPrice ? Number(row.buyPrice) : 100;
      const holdingType = row.type || type;

      let portfolio = portfolioMap.get(row.portfolio.toLowerCase());

      if (!portfolio) {
        try {
          portfolio = await Portfolio.create({
            userId,
            name: row.portfolio,
            type: holdingType,
            description: "Auto-created from CSV import",
          });
          portfolioMap.set(row.portfolio.toLowerCase(), portfolio);
          results.created.push(`Portfolio: ${row.portfolio}`);
        } catch {
          results.failed++;
          results.errors.push(
            `Row ${rowNum}: Failed to create portfolio ${row.portfolio}`
          );
          continue;
        }
      }

      const existingHolding = await StockHolding.findOne({
        userId,
        portfolioId: portfolio._id,
        symbol: row.symbol.toUpperCase(),
      });

      if (existingHolding) {
        const totalQuantity = existingHolding.quantity + quantity;
        const totalCost =
          existingHolding.quantity * existingHolding.buyPrice + quantity * buyPrice;
        const averagePrice = totalCost / totalQuantity;

        existingHolding.quantity = totalQuantity;
        existingHolding.buyPrice = averagePrice;
        await existingHolding.save();
        results.success++;
      } else {
        try {
          await StockHolding.create({
            userId,
            portfolioId: portfolio._id,
            symbol: row.symbol.toUpperCase(),
            quantity,
            buyPrice,
            type: holdingType,
            purchaseDate: new Date(),
          });
          results.success++;
        } catch {
          results.failed++;
          results.errors.push(
            `Row ${rowNum}: Failed to create holding for ${row.symbol}`
          );
        }
      }
    }

    return NextResponse.json({
      message: `Import complete: ${results.success} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process CSV data" },
      { status: 500 }
    );
  }
}

