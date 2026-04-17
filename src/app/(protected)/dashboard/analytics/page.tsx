"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AnalyticsPage() {
  const [type, setType] = useState<"" | "IPO" | "Secondary">("");
  const [days, setDays] = useState<string>("30");

  const qs = useMemo(() => {
    const d = Math.max(1, Math.min(365, Number(days) || 30));
    const t = type ? `&type=${encodeURIComponent(type)}` : "";
    return `/api/analytics?days=${encodeURIComponent(String(d))}${t}`;
  }, [days, type]);

  const { data, error, isLoading, mutate } = useSWR(qs, fetcher);

  const snapshots: any[] = data?.snapshots || [];
  const summary = data?.summary;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio value history (based on available price rows)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All</option>
              <option value="IPO">IPO</option>
              <option value="Secondary">Secondary</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Days</label>
            <Input value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => mutate()}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">
            Failed to load analytics.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary?.currentValue || 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Growth</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary?.totalGrowth || 0)}
            {!isLoading && (
              <div className="text-xs text-muted-foreground">
                {(summary?.totalGrowthPercent || 0).toFixed(2)}%
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Change</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {isLoading ? "…" : formatCurrency(summary?.dailyChange || 0)}
            {!isLoading && (
              <div className="text-xs text-muted-foreground">
                {(summary?.dailyChangePercent || 0).toFixed(2)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : snapshots.length ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3 text-right">Daily %</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(-120).reverse().map((s, i) => (
                    <tr key={`${s.date}-${i}`} className="border-b">
                      <td className="py-2 px-3">{String(s.date).slice(0, 10)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(s.value || 0)}</td>
                      <td className="py-2 px-3 text-right">
                        {(s.dailyChangePercent || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No snapshot rows computed yet. Make sure you have holdings and uploaded price data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

