import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { Portfolio } from "@/models";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: 1 });

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error("Get portfolios error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
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

    const { name, type, description } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (!["IPO", "Secondary"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'IPO' or 'Secondary'" },
        { status: 400 }
      );
    }

    await connectDb();

    const existingPortfolio = await Portfolio.findOne({
      userId,
      name,
      type,
    });

    if (existingPortfolio) {
      return NextResponse.json(
        { error: "A portfolio with this name already exists" },
        { status: 400 }
      );
    }

    const portfolio = await Portfolio.create({
      userId,
      name,
      type,
      description,
    });

    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error) {
    console.error("Create portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    );
  }
}

