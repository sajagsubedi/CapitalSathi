/* eslint-disable @next/next/no-img-element */
"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function Page() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60000,
  });

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground">
            Track your NEPSE investments and monitor performance
          </p>
        </div>

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-red-600">
              Failed to load dashboard data. Please refresh.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {isLoading ? "…" : formatCurrency(data?.summary?.totalNetWorth || 0)}
              {!isLoading && (
                <div className="text-xs text-muted-foreground">
                  {formatPercent(data?.summary?.totalProfitLossPercent || 0)} total return
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily P/L</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {isLoading ? "…" : formatCurrency(data?.summary?.dailyProfitLoss || 0)}
              {!isLoading && (
                <div className="text-xs text-muted-foreground">
                  {formatPercent(data?.summary?.dailyProfitLossPercent || 0)} today
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">IPO Value</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {isLoading ? "…" : formatCurrency(data?.summary?.ipoValue || 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Secondary Value</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {isLoading ? "…" : formatCurrency(data?.summary?.secondaryValue || 0)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (data?.portfolios || []).length ? (
                (data.portfolios as any[]).map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.type} · {p.holdingsCount} holdings
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(p.value || 0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercent(p.profitLossPercent || 0)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No portfolios yet. Create one in “Portfolios”.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (data?.topGainers || []).length ? (
                (data.topGainers as any[]).map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="font-medium">{h.symbol}</div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(h.currentValue || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercent(h.profitLossPercent || 0)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No holdings yet. Add stocks in IPO/Secondary pages.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Holdings (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (data?.holdings || []).length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">Symbol</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Avg Cost</th>
                      <th className="py-2 text-right">LTP</th>
                      <th className="py-2 text-right">Value</th>
                      <th className="py-2 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.holdings as any[]).slice(0, 10).map((h) => (
                      <tr key={h._id} className="border-b">
                        <td className="py-2 font-medium">{h.symbol}</td>
                        <td className="py-2">{h.type}</td>
                        <td className="py-2 text-right">
                          {Number(h.quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(h.buyPrice || 0)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(h.currentPrice || 0)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(h.currentValue || 0)}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(h.profitLoss || 0)}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({formatPercent(h.profitLossPercent || 0)})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No holdings yet. Add stocks to your portfolio.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
