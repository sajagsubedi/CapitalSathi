import mongoose, { Schema, Document } from "mongoose";

export interface IDailySnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  totalValue: number;
  ipoValue: number;
  secondaryValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  holdings: {
    symbol: string;
    quantity: number;
    price: number;
    value: number;
    type: "IPO" | "Secondary";
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const DailySnapshotSchema = new Schema<IDailySnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalValue: {
      type: Number,
      required: true,
      default: 0,
    },
    ipoValue: {
      type: Number,
      default: 0,
    },
    secondaryValue: {
      type: Number,
      default: 0,
    },
    dailyChange: {
      type: Number,
      default: 0,
    },
    dailyChangePercent: {
      type: Number,
      default: 0,
    },
    holdings: [
      {
        symbol: String,
        quantity: Number,
        price: Number,
        value: Number,
        type: {
          type: String,
          enum: ["IPO", "Secondary"],
        },
      },
    ],
  },
  { timestamps: true }
);

DailySnapshotSchema.index({ userId: 1, date: -1 });
DailySnapshotSchema.index({ userId: 1 });

export const DailySnapshot =
  mongoose.models.DailySnapshot ||
  mongoose.model<IDailySnapshot>("DailySnapshot", DailySnapshotSchema);

