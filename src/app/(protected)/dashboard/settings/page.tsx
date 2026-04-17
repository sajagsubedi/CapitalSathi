"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { data } = useSession();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signed in user</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <pre className="overflow-x-auto rounded-md bg-muted p-3">
            {JSON.stringify(data?.user ?? null, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

