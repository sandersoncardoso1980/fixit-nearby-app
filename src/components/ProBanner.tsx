import { Link } from "@tanstack/react-router";
import { BadgeCheck, Crown, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, CITY_NAME } from "@/lib/geo";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import type { Category, Profile } from "@/lib/types";

export function ProBanner({
  providers,
  categories,
  links,
}: {
  providers: Profile[];
  categories: Category[];
  links: { provider_id: string; category_id: string }[];
}) {
  if (providers.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Crown className="size-5 text-brand" /> Profissionais em destaque
          </h2>
          <p className="text-xs text-muted-foreground">
            Assinantes do plano PRO — recomendados em {CITY_NAME}.
          </p>
        </div>
        <Button asChild variant="soft" size="sm">
          <Link to="/pro">Quero aparecer aqui</Link>
        </Button>
      </div>

      <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
        {providers.map((p) => {
          const cat = categories.find((c) =>
            links.some((l) => l.provider_id === p.id && l.category_id === c.id),
          );
          return (
            <article
              key={p.id}
              className="relative w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl border border-brand/40 bg-card p-4 shadow-lift sm:w-[46%] lg:w-[31%]"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-hero" />
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <img
                  src={p.avatar_url ?? ""}
                  alt={`${cat ? `${cat.name} ` : "Profissional "}${p.full_name} em Entre Rios de Minas`}
                  loading="lazy"
                  className="size-16 rounded-xl object-cover ring-2 ring-brand/40"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-bold">
                      {cat ? `${cat.name} ` : ""}
                      {p.full_name.split(" ")[0]}
                    </h3>
                    {p.is_verified && <BadgeCheck className="size-4 shrink-0 text-brand" />}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-warning text-warning" />
                    <strong className="text-foreground">{p.rating_avg.toFixed(1).replace(".", ",")}</strong>
                    · {p.total_reviews} avaliações
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {p.city ?? CITY_NAME}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.is_verified && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <BadgeCheck className="size-3" /> Verificado
                      </Badge>
                    )}
                    <Badge className="gap-1 border-0 bg-gradient-hero text-[10px] text-white">
                      <Crown className="size-3" /> PRO — recomendado
                    </Badge>
                  </div>
                </div>
              </div>

              {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}

              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <p className="text-sm">
                  <span className="text-base font-bold">{brl(p.hourly_rate)}</span>
                  <span className="text-xs text-muted-foreground">/hora</span>
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/prestadores/$id" params={{ id: p.id }}>
                      Perfil
                    </Link>
                  </Button>
                  <WhatsAppButton provider={p} categoryName={cat?.name ?? null} label="Solicitar" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
