import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, BadgeCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/StarRating";
import { RequestDialog } from "@/components/RequestDialog";
import { categoriesQuery, providerCategoriesQuery, providerQuery, reviewsQuery } from "@/lib/queries";
import { brl, distanceKm, formatKm, DEFAULT_CENTER } from "@/lib/geo";

export const Route = createFileRoute("/prestadores/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do profissional — ServiçoJá" },
      {
        name: "description",
        content: "Veja portfólio, avaliações, preço por hora e distância antes de contratar.",
      },
      { property: "og:title", content: "Perfil do profissional — ServiçoJá" },
      { property: "og:description", content: "Portfólio, avaliações e preços do profissional." },
    ],
  }),
  component: ProviderProfile,
});

function ProviderProfile() {
  const { id } = useParams({ from: "/prestadores/$id" });
  const { data: provider, isLoading } = useQuery(providerQuery(id));
  const { data: reviews = [] } = useQuery(reviewsQuery(id));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);
  const [open, setOpen] = useState(false);

  if (isLoading) return <Skeleton className="mx-4 my-10 h-96 rounded-2xl" />;
  if (!provider)
    return <p className="px-4 py-20 text-center text-muted-foreground">Profissional não encontrado.</p>;

  const cats = categories.filter((c) =>
    links.some((l) => l.provider_id === provider.id && l.category_id === c.id),
  );
  const dist = distanceKm(DEFAULT_CENTER, { lat: provider.latitude, lng: provider.longitude });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
          <img
            src={provider.avatar_url ?? ""}
            alt={provider.full_name}
            className="size-20 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-xl font-extrabold">
              {provider.full_name}
              <BadgeCheck className="size-4 shrink-0 text-brand" />
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <StarRating value={provider.rating_avg} size={14} /> {provider.rating_avg.toFixed(1)} (
                {provider.total_reviews})
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {formatKm(dist)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {provider.jobs_done} serviços
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {provider.bio && <p className="mt-4 text-sm text-muted-foreground">{provider.bio}</p>}

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t pt-4">
          <p className="min-w-0 truncate text-sm">
            <span className="text-lg font-extrabold">{brl(provider.hourly_rate)}</span>
            <span className="text-muted-foreground"> /hora</span>
          </p>
          <Button variant="brand" onClick={() => setOpen(true)}>
            Solicitar orçamento
          </Button>
        </div>
      </div>

      {provider.portfolio.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Portfólio</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {provider.portfolio.map((src) => (
              <img
                key={src}
                src={src}
                alt={`Trabalho de ${provider.full_name}`}
                loading="lazy"
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">Avaliações</h2>
        <div className="mt-3 space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não há avaliações.</p>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2">
                <img
                  src={r.reviewer?.avatar_url ?? ""}
                  alt=""
                  className="size-8 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.reviewer?.full_name ?? "Cliente"}</p>
                  <StarRating value={r.rating} size={12} />
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
            </article>
          ))}
        </div>
      </section>

      <RequestDialog provider={provider} categories={categories} open={open} onOpenChange={setOpen} />
    </div>
  );
}
