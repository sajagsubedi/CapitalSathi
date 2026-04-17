import mongoose, { Schema, Document } from "mongoose";

export interface IPortfolio extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: "IPO" | "Secondary";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Portfolio name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["IPO", "Secondary"],
      required: [true, "Portfolio type is required"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Optional (for faster queries)
PortfolioSchema.index({ userId: 1 });

PortfolioSchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

export const Portfolio =
  mongoose.models.Portfolio ||
  mongoose.model<IPortfolio>("Portfolio", PortfolioSchema);
