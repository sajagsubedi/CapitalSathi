"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "react-toastify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Portfolio = {
  _id: string;
  name: string;
  type: "IPO" | "Secondary";
  description?: string;
  createdAt: string;
};

export default function PortfoliosPage() {
  const { data, isLoading } = useSWR("/api/portfolio", fetcher);
  const portfolios: Portfolio[] = data?.portfolios || [];

  const [name, setName] = useState("");
  const [type, setType] = useState<"IPO" | "Secondary">("IPO");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  const createPortfolio = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, description }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error || "Failed to create portfolio");
        return;
      }
      toast.success("Portfolio created");
      setName("");
      setDescription("");
      setType("IPO");
      mutate("/api/portfolio");
      mutate("/api/dashboard");
    } catch {
      toast.error("Failed to create portfolio");
    } finally {
      setSaving(false);
    }
  };

  const deletePortfolio = async (id: string) => {
    if (!confirm("Delete this portfolio and all its holdings?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Failed to delete portfolio");
        return;
      }
      toast.success("Portfolio deleted");
      mutate("/api/portfolio");
      mutate("/api/dashboard");
      mutate("/api/stocks");
    } catch {
      toast.error("Failed to delete portfolio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Portfolios</h1>
        <p className="text-sm text-muted-foreground">
          Create portfolios to group IPO and Secondary holdings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary" />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "IPO" | "Secondary")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="IPO">IPO</option>
              <option value="Secondary">Secondary</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note"
            />
          </div>
          <div className="md:col-span-3">
            <Button onClick={createPortfolio} disabled={!canCreate}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Portfolios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : portfolios.length ? (
            portfolios.map((p) => (
              <div key={p._id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.type}
                    {p.description ? ` · ${p.description}` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => deletePortfolio(p._id)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No portfolios yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

