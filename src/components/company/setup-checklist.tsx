import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupChecklist({
  items,
  title = "Setup Checklist",
}: {
  title?: string;
  items: Array<{ label: string; done?: boolean }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 text-slate-300" aria-hidden />
            )}
            <span className={item.done ? "text-slate-900" : "text-slate-600"}>{item.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
