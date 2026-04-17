import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDb from "@/lib/connectDb";
import { StockHolding } from "@/models";

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

    const holding = await StockHolding.findOne({ _id: id, userId }).populate(
      "portfolioId",
      "name type",
    );

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    return NextResponse.json({ holding });
  } catch (error) {
    console.error("Get holding error:", error);
    return NextResponse.json(
      { error: "Failed to fetch holding" },
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

    const { quantity, buyPrice, notes } = await req.json();

    await connectDb();

    const holding = await StockHolding.findOneAndUpdate(
      { _id: id, userId },
      { quantity, buyPrice, notes },
      { new: true },
    );

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    return NextResponse.json({ holding });
  } catch (error) {
    console.error("Update holding error:", error);
    return NextResponse.json(
      { error: "Failed to update holding" },
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

    const holding = await StockHolding.findOneAndDelete({ _id: id, userId });
    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Holding deleted successfully" });
  } catch (error) {
    console.error("Delete holding error:", error);
    return NextResponse.json(
      { error: "Failed to delete holding" },
      { status: 500 },
    );
  }
}
