import mongoose, { Schema, Document } from "mongoose";

export interface IStockHolding extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  portfolioId: mongoose.Types.ObjectId;
  symbol: string;
  quantity: number;
  buyPrice: number;
  type: "IPO" | "Secondary";
  purchaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockHoldingSchema = new Schema<IStockHolding>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    portfolioId: {
      type: Schema.Types.ObjectId,
      ref: "Portfolio",
      required: true,
    },
    symbol: {
      type: String,
      required: [true, "Stock symbol is required"],
      uppercase: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    buyPrice: {
      type: Number,
      required: [true, "Buy price is required"],
      min: [0, "Price cannot be negative"],
    },
    type: {
      type: String,
      enum: ["IPO", "Secondary"],
      required: true,
    },
    purchaseDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

StockHoldingSchema.index({ userId: 1 });
StockHoldingSchema.index({ portfolioId: 1 });
StockHoldingSchema.index({ symbol: 1 });
StockHoldingSchema.index({ userId: 1, portfolioId: 1, symbol: 1 });

export const StockHolding =
  mongoose.models.StockHolding ||
  mongoose.model<IStockHolding>("StockHolding", StockHoldingSchema);

