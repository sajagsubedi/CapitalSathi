import mongoose, { Schema, Document } from "mongoose"

export interface IPriceData extends Document {
  _id: mongoose.Types.ObjectId
  securityId?: string
  securityName?: string
  symbol: string
  price: number
  openPrice?: number
  previousClose?: number
  change?: number
  changePercent?: number
  high?: number
  low?: number
  volume?: number
  totalTradedValue?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  lastUpdatedTime?: string
  lastUpdatedPrice?: number
  totalTrades?: number
  averageTradedPrice?: number
  marketCapitalization?: number
  date: Date
  createdAt: Date
  updatedAt: Date
}

const PriceDataSchema = new Schema<IPriceData>(
  {
    securityId: {
      type: String,
      trim: true,
    },
    securityName: {
      type: String,
      trim: true,
    },
    symbol: {
      type: String,
      required: [true, "Symbol is required"],
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    openPrice: {
      type: Number,
      min: 0,
    },
    previousClose: {
      type: Number,
      min: 0,
    },
    change: {
      type: Number,
    },
    changePercent: {
      type: Number,
    },
    high: {
      type: Number,
      min: 0,
    },
    low: {
      type: Number,
      min: 0,
    },
    volume: {
      type: Number,
      min: 0,
    },
    totalTradedValue: {
      type: Number,
      min: 0,
    },
    fiftyTwoWeekHigh: {
      type: Number,
      min: 0,
    },
    fiftyTwoWeekLow: {
      type: Number,
      min: 0,
    },
    lastUpdatedTime: {
      type: String,
      trim: true,
    },
    lastUpdatedPrice: {
      type: Number,
      min: 0,
    },
    totalTrades: {
      type: Number,
      min: 0,
    },
    averageTradedPrice: {
      type: Number,
      min: 0,
    },
    marketCapitalization: {
      type: Number,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

PriceDataSchema.index({ symbol: 1, date: -1 })
PriceDataSchema.index({ symbol: 1 })
PriceDataSchema.index({ date: -1 })

export const PriceData =
  mongoose.models.PriceData || mongoose.model<IPriceData>("PriceData", PriceDataSchema)
