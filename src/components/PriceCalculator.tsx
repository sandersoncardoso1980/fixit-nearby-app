import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/geo";
import type { Category } from "@/lib/types";

const COMPLEXITY = [
  { label: "Simples", factor: 0.8 },
  { label: "Média", factor: 1.15 },
  { label: "Complexa", factor: 1.6 },
  { label: "Urgente / fora de horário", factor: 2.1 },
];

export function PriceCalculator({ categories }: { categories: Category[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [complexity, setComplexity] = useState(1);
  const [hours, setHours] = useState(2);

  const category = categories.find((c) => c.id === categoryId) ?? categories[0];

  const estimate = useMemo(() => {
    if (!category) return { min: 0, max: 0 };
    const base = category.base_estimated_price * COMPLEXITY[complexity]!.factor;
    const total = base + base * 0.35 * (hours - 1);
    return { min: Math.round(total * 0.85), max: Math.round(total * 1.25) };
  }, [category, complexity, hours]);

  return (
    <Card className="border-primary/20 bg-accent/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4 text-primary" />
          Calculadora de preço estimado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Tipo de serviço</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Complexidade</Label>
            <span className="text-xs font-medium text-primary">
              {COMPLEXITY[complexity]!.label}
            </span>
          </div>
          <Slider
            value={[complexity]}
            min={0}
            max={3}
            step={1}
            onValueChange={([v]) => setComplexity(v ?? 0)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Duração estimada</Label>
            <span className="text-xs font-medium text-primary">{hours}h</span>
          </div>
          <Slider value={[hours]} min={1} max={8} step={1} onValueChange={([v]) => setHours(v ?? 1)} />
        </div>

        <div className="rounded-xl bg-card p-4 text-center shadow-soft">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Média praticada na região
          </p>
          <p className="mt-1 text-2xl font-bold">
            {brl(estimate.min)} <span className="text-base font-normal text-muted-foreground">a</span>{" "}
            {brl(estimate.max)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
