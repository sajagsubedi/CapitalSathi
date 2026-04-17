"use client";

import { useMemo, useState } from "react";
import Papa, { type ParseResult } from "papaparse";
import useSWR from "swr";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type IndividualStockCSVRow = {
  symbol: string;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  percentChange?: number;
  volume?: number;
  turnover?: number;
};

export default function IndividualStocksPage() {
  const [symbol, setSymbol] = useState("");
  const activeSymbol = symbol.trim().toUpperCase();

  const { data, error, isLoading, mutate } = useSWR(
    activeSymbol ? `/api/individual-stocks?symbol=${encodeURIComponent(activeSymbol)}` : null,
    fetcher
  );

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<IndividualStockCSVRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const parsedCount = useMemo(() => rows.length, [rows]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setRows([]);
    if (!f) return;

    Papa.parse<IndividualStockCSVRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (res: ParseResult<IndividualStockCSVRow>) => {
        if (res.errors?.length) {
          toast.error(res.errors[0].message);
          return;
        }
        setRows(res.data || []);
      },
      error: (err: Error) => toast.error(err.message),
    });
  };

  const upload = async () => {
    if (!rows.length) {
      toast.error("No rows to upload");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/individual-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: activeSymbol || undefined, rows }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error || "Upload failed");
        return;
      }
      toast.success(body?.message || "Uploaded");
      await mutate();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const latest = data?.latest;
  const prices: any[] = data?.prices || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Individual Stocks</h1>
        <p className="text-sm text-muted-foreground">
          Browse historical prices per symbol and upload symbol-level CSV
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Browse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:max-w-xs">
            <label className="text-xs text-muted-foreground">Symbol</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="NABIL" />
          </div>

          {error && (
            <div className="text-sm text-red-600">Failed to load symbol data.</div>
          )}

          {activeSymbol && (
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `Rows: ${prices.length}`}
            </div>
          )}

          {latest && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">{activeSymbol}</div>
              <div className="text-muted-foreground">
                Latest: {latest.price} · Change: {latest.change ?? ""} ({latest.changePercent ?? ""}%)
              </div>
            </div>
          )}

          {!!prices.length && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Open</th>
                    <th className="py-2 px-3 text-right">High</th>
                    <th className="py-2 px-3 text-right">Low</th>
                    <th className="py-2 px-3 text-right">Close</th>
                    <th className="py-2 px-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.slice(0, 200).map((p, i) => (
                    <tr key={`${p.date}-${i}`} className="border-b">
                      <td className="py-2 px-3">{String(p.date).slice(0, 10)}</td>
                      <td className="py-2 px-3 text-right">{p.open ?? ""}</td>
                      <td className="py-2 px-3 text-right">{p.high ?? ""}</td>
                      <td className="py-2 px-3 text-right">{p.low ?? ""}</td>
                      <td className="py-2 px-3 text-right">{p.close ?? ""}</td>
                      <td className="py-2 px-3 text-right">{p.volume ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {prices.length > 200 && (
            <div className="text-xs text-muted-foreground">Showing first 200 rows.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
          {file && (
            <div className="text-xs text-muted-foreground">
              Selected: {file.name} · Parsed rows: {parsedCount}
            </div>
          )}
          <Button onClick={upload} disabled={!rows.length || uploading}>
            {uploading ? "Uploading…" : `Upload ${rows.length} rows`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

