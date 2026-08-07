import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import { brl } from "@/lib/geo";
import type { Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function CompareDialog({
  providers,
  open,
  onOpenChange,
}: {
  providers: Profile[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const rows: { label: string; render: (p: Profile) => React.ReactNode }[] = [
    {
      label: "Avaliação",
      render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <StarRating value={p.rating_avg} size={12} />
          <span className="text-xs text-muted-foreground">
            {p.rating_avg.toFixed(1)} · {p.total_reviews} avaliações
          </span>
        </div>
      ),
    },
    { label: "Preço/hora", render: (p) => <strong>{brl(p.hourly_rate)}</strong> },
    { label: "Serviços feitos", render: (p) => `${p.jobs_done}` },
    {
      label: "Disponibilidade",
      render: (p) =>
        p.is_online ? (
          <Badge className="bg-success/15 text-success hover:bg-success/15">Online</Badge>
        ) : (
          <Badge variant="secondary">Offline</Badge>
        ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparar prestadores</DialogTitle>
          <DialogDescription>Veja lado a lado valores, reputação e disponibilidade.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr>
                <th className="w-32 text-left text-xs font-medium text-muted-foreground">—</th>
                {providers.map((p) => (
                  <th key={p.id} className="px-2 text-left">
                    <div className="flex items-center gap-2">
                      <img
                        src={p.avatar_url ?? ""}
                        alt=""
                        className="size-9 rounded-lg object-cover"
                      />
                      <span className="text-sm font-semibold">{p.full_name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="rounded-l-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {r.label}
                  </td>
                  {providers.map((p) => (
                    <td key={p.id} className="bg-muted/30 px-3 py-2 last:rounded-r-lg">
                      {r.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
