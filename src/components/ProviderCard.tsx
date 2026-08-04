import { Link } from "@tanstack/react-router";
import { MapPin, BadgeCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "@/components/StarRating";
import { brl, formatKm } from "@/lib/geo";
import type { Category, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProviderCard({
  provider,
  distance,
  categories,
  selected,
  onToggleCompare,
  onHire,
}: {
  provider: Profile;
  distance: number;
  categories: Category[];
  selected: boolean;
  onToggleCompare: () => void;
  onHire: () => void;
}) {
  return (
    <article
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-all hover:shadow-lift",
        selected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={provider.avatar_url ?? ""}
            alt={`Foto de ${provider.full_name}`}
            loading="lazy"
            className="size-14 rounded-xl object-cover"
          />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card",
              provider.is_online ? "bg-success" : "bg-muted-foreground/50",
            )}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{provider.full_name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <StarRating value={provider.rating_avg} size={12} />
              <strong className="text-foreground">{provider.rating_avg.toFixed(1)}</strong>(
              {provider.total_reviews})
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="size-3" />
              {provider.jobs_done} serviços
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {formatKm(distance)}
            </span>
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <Checkbox checked={selected} onCheckedChange={onToggleCompare} />
          comparar
        </label>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{provider.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Badge key={c.id} variant="secondary" className="font-normal">
            {c.name}
          </Badge>
        ))}
        {provider.is_online && (
          <Badge className="gap-1 bg-success/15 text-success hover:bg-success/15">
            <BadgeCheck className="size-3" /> Disponível agora
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-sm">
          <span className="text-lg font-bold text-foreground">{brl(provider.hourly_rate)}</span>
          <span className="text-xs text-muted-foreground">/hora</span>
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/prestadores/$id" params={{ id: provider.id }}>
              Perfil
            </Link>
          </Button>
          <Button variant="brand" size="sm" onClick={onHire}>
            Solicitar
          </Button>
        </div>
      </div>
    </article>
  );
}
