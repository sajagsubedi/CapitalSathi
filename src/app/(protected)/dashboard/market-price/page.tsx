"use client";

import { useMemo, useState } from "react";
import Papa, { type ParseResult } from "papaparse";
import useSWR from "swr";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type MarketPriceCSVRow = Record<string, unknown>;

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MarketPricePage() {
  const [businessDate, setBusinessDate] = useState(todayKey());
  const { data, error, isLoading, mutate } = useSWR(
    businessDate ? `/api/market-prices?businessDate=${encodeURIComponent(businessDate)}` : null,
    fetcher
  );

  const prices: any[] = data?.prices || [];

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<MarketPriceCSVRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const parsedCount = useMemo(() => rows.length, [rows]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setRows([]);
    if (!f) return;

    Papa.parse<MarketPriceCSVRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res: ParseResult<MarketPriceCSVRow>) => {
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
      const res = await fetch("/api/market-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Market Price</h1>
        <p className="text-sm text-muted-foreground">
          Upload daily market prices CSV and browse prices by business date
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Browse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:max-w-xs">
            <label className="text-xs text-muted-foreground">Business Date (YYYY-MM-DD)</label>
            <Input value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
          </div>

          {error && (
            <div className="text-sm text-red-600">Failed to load prices for that date.</div>
          )}

          <div className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `Rows: ${prices.length}`}
          </div>

          {!!prices.length && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3 text-right">Close</th>
                    <th className="py-2 px-3 text-right">Change %</th>
                    <th className="py-2 px-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.slice(0, 200).map((p, i) => (
                    <tr key={`${p.symbol}-${i}`} className="border-b">
                      <td className="py-2 px-3 font-medium">{p.symbol}</td>
                      <td className="py-2 px-3 text-right">{p.price}</td>
                      <td className="py-2 px-3 text-right">{p.changePercent ?? ""}</td>
                      <td className="py-2 px-3 text-right">{p.volume ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {prices.length > 200 && (
            <div className="text-xs text-muted-foreground">
              Showing first 200 rows.
            </div>
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

