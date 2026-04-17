import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { Portfolio, StockHolding } from "@/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const portfolio = await Portfolio.findOne({ _id: id, userId });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();

    await connectDb();

    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: id, userId },
      { name, description },
      { new: true },
    );

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ portfolio });
  } catch (error) {
    console.error("Update portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    await StockHolding.deleteMany({ portfolioId: id, userId });

    const portfolio = await Portfolio.findOneAndDelete({ _id: id, userId });
    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 },
    );
  }
}
