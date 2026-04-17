"use client";

import { useState } from "react";
import Papa, { type ParseResult } from "papaparse";
import { toast } from "react-toastify";
import { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CSVRow = {
  symbol?: string;
  quantity?: string | number;
  portfolio?: string;
  buyPrice?: string | number;
  type?: string;
};

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
  created: string[];
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [importType, setImportType] = useState<"IPO" | "Secondary">("IPO");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseFile = (f: File) => {
    setFile(f);
    setResult(null);
    Papa.parse<CSVRow>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.toLowerCase().trim(),
      complete: (res: ParseResult<CSVRow>) => {
        if (res.errors?.length) {
          toast.error(res.errors[0].message);
          setRows([]);
          return;
        }
        const data = (res.data || []).filter((r: CSVRow) => r.symbol && r.quantity && r.portfolio);
        if (!data.length) {
          toast.error(
            "No valid rows found. Required columns: symbol, quantity, portfolio"
          );
          setRows([]);
          return;
        }
        setRows(data);
      },
      error: (err: Error) => {
        toast.error(err.message);
        setRows([]);
      },
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const upload = async () => {
    if (!rows.length) return;
    setIsUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rows, type: importType }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error || "Import failed");
        return;
      }
      toast.success(body?.message || "Import complete");
      setResult(body.results);
      mutate("/api/stocks");
      mutate("/api/stocks?type=IPO");
      mutate("/api/stocks?type=Secondary");
      mutate("/api/portfolio");
      mutate("/api/dashboard");
    } catch {
      toast.error("Import failed");
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
  };

  const downloadTemplate = () => {
    const template = `symbol,quantity,portfolio,buyPrice
NABIL,10,Primary,100
NTC,20,Primary,100
NICA,15,acc1,100`;
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Import CSV</h1>
        <p className="text-sm text-muted-foreground">
          Bulk import holdings (symbol, quantity, portfolio, optional buyPrice)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Required columns: <code>symbol</code>, <code>quantity</code>,{" "}
            <code>portfolio</code>. Optional: <code>buyPrice</code>, <code>type</code>.
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            Download template
          </Button>
        </CardContent>
      </Card>

      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Import Type</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as "IPO" | "Secondary")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="IPO">IPO</option>
                <option value="Secondary">Secondary</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">CSV File</label>
              <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
              {file && (
                <div className="text-xs text-muted-foreground">
                  Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                </div>
              )}
            </div>

            {!!rows.length && (
              <div className="space-y-2">
                <div className="text-sm">
                  Preview ({rows.length} rows){rows.length > 50 ? " — showing first 50" : ""}
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 px-3">Symbol</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Portfolio</th>
                        <th className="py-2 px-3">Buy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-3 font-medium">
                            {String(r.symbol || "").toUpperCase()}
                          </td>
                          <td className="py-2 px-3">{String(r.quantity || "")}</td>
                          <td className="py-2 px-3">{String(r.portfolio || "")}</td>
                          <td className="py-2 px-3">{String(r.buyPrice || "100")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={upload} disabled={!rows.length || isUploading}>
                {isUploading ? "Importing…" : `Import ${rows.length} rows`}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isUploading}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Success: <b>{result.success}</b> · Failed: <b>{result.failed}</b>
            </div>
            {!!result.created?.length && (
              <div className="text-sm text-muted-foreground">
                Created: {result.created.join(", ")}
              </div>
            )}
            {!!result.errors?.length && (
              <div className="text-sm text-red-600 space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
            <Button onClick={reset}>Import another</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

