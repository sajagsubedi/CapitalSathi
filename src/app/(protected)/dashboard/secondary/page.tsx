"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Portfolio = { _id: string; name: string; type: "IPO" | "Secondary" };
type Holding = {
  _id: string;
  symbol: string;
  quantity: number;
  buyPrice: number;
  type: "IPO" | "Secondary";
  portfolioId: string;
  portfolioName?: string;
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function SecondaryPage() {
  const { data: stocksData, isLoading: stocksLoading } = useSWR(
    "/api/stocks?type=Secondary",
    fetcher
  );
  const { data: portfoliosData, isLoading: portfoliosLoading } = useSWR(
    "/api/portfolio",
    fetcher
  );
  const { data: pricesData, isLoading: pricesLoading } = useSWR("/api/prices", fetcher);

  const isLoading = stocksLoading || portfoliosLoading || pricesLoading;

  const holdings: Holding[] = stocksData?.holdings || [];
  const portfolios: Portfolio[] = (portfoliosData?.portfolios || []).filter(
    (p: Portfolio) => p.type === "Secondary"
  );
  const prices = pricesData?.prices || {};

  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState<string>("0");
  const [buyPrice, setBuyPrice] = useState<string>("");
  const [portfolioId, setPortfolioId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Holding | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [editBuy, setEditBuy] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;
    let totalProfitLoss = 0;
    for (const h of holdings) {
      const currentPrice = prices[h.symbol]?.price || h.buyPrice;
      const currentValue = h.quantity * currentPrice;
      const invested = h.quantity * h.buyPrice;
      totalValue += currentValue;
      totalInvested += invested;
      totalProfitLoss += currentValue - invested;
    }
    const plPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
    return { totalValue, totalInvested, totalProfitLoss, plPct };
  }, [holdings, prices]);

  const refresh = () => {
    mutate("/api/stocks?type=Secondary");
    mutate("/api/prices");
    mutate("/api/dashboard");
  };

  const addHolding = async () => {
    if (!symbol.trim() || !portfolioId) {
      toast.error("Symbol and portfolio are required");
      return;
    }
    const qty = Number(quantity);
    const buy = Number(buyPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(buy) || buy <= 0) {
      toast.error("Invalid quantity or buy price");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          quantity: qty,
          buyPrice: buy,
          portfolioId,
          type: "Secondary",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error || "Failed to add holding");
        return;
      }
      toast.success("Holding saved");
      setSymbol("");
      setQuantity("0");
      setBuyPrice("");
      refresh();
    } catch {
      toast.error("Failed to add holding");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (h: Holding) => {
    setEditing(h);
    setEditQty(String(h.quantity));
    setEditBuy(String(h.buyPrice));
    setEditNotes("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const qty = Number(editQty);
    const buy = Number(editBuy);
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(buy) || buy < 0) {
      toast.error("Invalid values");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/stocks/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, buyPrice: buy, notes: editNotes || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error || "Failed to update holding");
        return;
      }
      toast.success("Holding updated");
      setEditing(null);
      refresh();
    } catch {
      toast.error("Failed to update holding");
    } finally {
      setSaving(false);
    }
  };

  const deleteHolding = async (id: string) => {
    if (!confirm("Delete this holding?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Failed to delete holding");
        return;
      }
      toast.success("Holding deleted");
      refresh();
    } catch {
      toast.error("Failed to delete holding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Secondary Market</h1>
        <p className="text-sm text-muted-foreground">
          Track secondary holdings with buy price and P/L
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary.totalValue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary.totalInvested)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit / Loss</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary.totalProfitLoss)}
            {!isLoading && (
              <div className="text-xs text-muted-foreground">
                {summary.plPct >= 0 ? "+" : ""}
                {summary.plPct.toFixed(2)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Secondary Holding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Symbol</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NABIL" />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Quantity</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Buy Price</label>
            <Input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="e.g. 540" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Portfolio</label>
            <select
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select portfolio…</option>
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-5">
            <Button onClick={addHolding} disabled={saving}>
              {saving ? "Saving…" : "Add / Update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : portfolios.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Create a Secondary portfolio first in “Portfolios”.
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No Secondary holdings yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Portfolio</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Buy</th>
                    <th className="py-2 text-right">LTP</th>
                    <th className="py-2 text-right">Value</th>
                    <th className="py-2 text-right">P/L</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const ltp = prices[h.symbol]?.price || h.buyPrice;
                    const value = h.quantity * ltp;
                    const invested = h.quantity * h.buyPrice;
                    const pl = value - invested;
                    return (
                      <tr key={h._id} className="border-b">
                        <td className="py-2 font-medium">{h.symbol}</td>
                        <td className="py-2">{h.portfolioName || "—"}</td>
                        <td className="py-2 text-right">{h.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(h.buyPrice)}</td>
                        <td className="py-2 text-right">{formatCurrency(ltp)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(value)}</td>
                        <td className="py-2 text-right">{formatCurrency(pl)}</td>
                        <td className="py-2 text-right space-x-2">
                          <Button variant="ghost" onClick={() => startEdit(h)} disabled={saving}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => deleteHolding(h._id)}
                            disabled={saving}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit {editing.symbol}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">Quantity</label>
              <Input value={editQty} onChange={(e) => setEditQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Buy Price</label>
              <Input value={editBuy} onChange={(e) => setEditBuy(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="md:col-span-3 space-x-2">
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

