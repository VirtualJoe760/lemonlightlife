import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat, Zap } from "lucide-react";

export default function App() {
  const [health, setHealth] = useState(null);
  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center gap-3 mb-2">
        <HardHat className="text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Construction Matchmaker</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Scaffold + Tailwind + shadcn wired up. Full UI ships in task #6.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5" />
            Backend connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={async () => {
            const r = await fetch("/api/health");
            setHealth(await r.json());
          }}>
            Ping /api/health
          </Button>
          {health && (
            <div className="flex items-center gap-2">
              <Badge variant="success">{health.ok ? "OK" : "FAIL"}</Badge>
              <code className="text-xs text-muted-foreground">{JSON.stringify(health)}</code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
