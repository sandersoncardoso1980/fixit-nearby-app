import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, Scale, X, ShieldCheck, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProviderCard } from "@/components/ProviderCard";
import { ProviderMap } from "@/components/ProviderMap";
import { CompareDialog } from "@/components/CompareDialog";
import { PriceCalculator } from "@/components/PriceCalculator";
import { RequestDialog } from "@/components/RequestDialog";
import { categoriesQuery, providerCategoriesQuery, providersQuery } from "@/lib/queries";
import { DEFAULT_CENTER, distanceKm } from "@/lib/geo";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiçoJá — Encontre profissionais perto de você" },
      {
        name: "description",
        content:
          "Eletricistas, encanadores, pintores, chaveiros e diaristas por perto. Compare preço, distância e avaliação e contrate em minutos.",
      },
      { property: "og:title", content: "ServiçoJá — Encontre profissionais perto de você" },
      {
        property: "og:description",
        content: "Compare preço, distância e avaliação de prestadores locais e contrate em minutos.",
      },
    ],
  }),
  component: Home,
});

type SortKey = "rating" | "price" | "distance" | "online";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Melhor avaliado" },
  { key: "price", label: "Menor preço/hora" },
  { key: "distance", label: "Mais próximo" },
  { key: "online", label: "Disponível agora" },
];

const RADII = [5, 10, 20];

function Home() {
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: providers = [], isLoading } = useQuery(providersQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);

  const [search, setSearch] = useState("");
  const [city, setCity] = useState("São Paulo, SP");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [radius, setRadius] = useState(10);
  const [sort, setSort] = useState<SortKey>("rating");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<Profile | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const center = DEFAULT_CENTER;

  const distances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of providers) {
      map[p.id] = distanceKm(center, { lat: p.latitude, lng: p.longitude });
    }
    return map;
  }, [providers, center]);

  const catsByProvider = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of links) (map[l.provider_id] ??= []).push(l.category_id);
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = providers.filter((p) => {
      if ((distances[p.id] ?? Infinity) > radius) return false;
      if (categoryId && !(catsByProvider[p.id] ?? []).includes(categoryId)) return false;
      if (sort === "online" && !p.is_online) return false;
      if (term) {
        const catNames = (catsByProvider[p.id] ?? [])
          .map((id) => categories.find((c) => c.id === id)?.name ?? "")
          .join(" ");
        const haystack = `${p.full_name} ${p.bio ?? ""} ${catNames}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sort === "price") return (a.hourly_rate ?? 1e9) - (b.hourly_rate ?? 1e9);
      if (sort === "distance") return (distances[a.id] ?? 1e9) - (distances[b.id] ?? 1e9);
      return b.rating_avg - a.rating_avg;
    });
  }, [providers, distances, radius, categoryId, catsByProvider, sort, search, categories]);

  const compareProviders = providers.filter((p) => compare.includes(p.id));

  function toggleCompare(id: string) {
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <Badge className="mb-4 border-0 bg-white/15 text-white hover:bg-white/15">
            +1.200 profissionais verificados
          </Badge>
          <h1 className="max-w-2xl text-balance-tight text-3xl font-extrabold leading-tight md:text-5xl">
            Um profissional de confiança, a poucos minutos de você.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
            Descreva o problema, compare orçamentos e acompanhe o serviço do pedido à conclusão.
          </p>

          <div className="mt-7 grid gap-2 rounded-2xl bg-card p-2 shadow-lift sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto]">
            <div className="flex min-w-0 items-center gap-2 rounded-xl px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qual serviço você precisa?"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl px-3 sm:border-l">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade ou CEP"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              variant="brand"
              size="lg"
              onClick={() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" })}
            >
              Buscar
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/80">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Profissionais avaliados
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="size-4" /> Resposta em até 15 min
            </li>
            <li className="flex items-center gap-1.5">
              <Wallet className="size-4" /> Orçamento sem compromisso
            </li>
          </ul>
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-lg font-bold">Categorias</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(active ? null : c.id)}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift",
                  active && "border-primary bg-accent",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                  )}
                >
                  <CategoryIcon name={c.icon_name} className="size-5" />
                </span>
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-[11px] leading-snug text-muted-foreground">
                  a partir de R$ {c.base_estimated_price}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Mapa + filtros */}
      <section id="resultados" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-card px-4 py-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  Prestadores em {city.split(",")[0]}
                </p>
                <div className="flex shrink-0 gap-1">
                  {RADII.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={radius === r ? "default" : "outline"}
                      onClick={() => setRadius(r)}
                    >
                      {r} km
                    </Button>
                  ))}
                </div>
              </div>
              <div className="h-[320px] w-full md:h-[380px]">
                <ProviderMap
                  center={center}
                  radiusKm={radius}
                  providers={filtered}
                  onSelect={(id) => navigate({ to: "/prestadores/$id", params: { id } })}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <SlidersHorizontal className="size-3.5" /> Ordenar por
              </span>
              {SORTS.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={sort === s.key ? "default" : "soft"}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              {!isLoading &&
                filtered.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    distance={distances[p.id] ?? Infinity}
                    categories={categories.filter((c) =>
                      (catsByProvider[p.id] ?? []).includes(c.id),
                    )}
                    selected={compare.includes(p.id)}
                    onToggleCompare={() => toggleCompare(p.id)}
                    onHire={() => {
                      setHireTarget(p);
                      setRequestOpen(true);
                    }}
                  />
                ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhum profissional encontrado com esses filtros. Aumente o raio de busca.
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <PriceCalculator categories={categories} />
            <div className="rounded-2xl border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-semibold">Não sabe quem chamar?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Publique um chamado aberto e receba propostas dos prestadores da sua região.
              </p>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => {
                  setHireTarget(null);
                  setRequestOpen(true);
                }}
              >
                Publicar chamado aberto
              </Button>
            </div>
          </aside>
        </div>
      </section>

      {/* Barra de comparação */}
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-lift backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              {compareProviders.map((p) => (
                <span
                  key={p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent py-1 pl-1 pr-2 text-xs"
                >
                  <img src={p.avatar_url ?? ""} alt="" className="size-6 rounded-full object-cover" />
                  {p.full_name.split(" ")[0]}
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="cursor-pointer text-muted-foreground"
                    aria-label={`Remover ${p.full_name}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <Button variant="brand" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
              <Scale /> Comparar ({compare.length}/3)
            </Button>
          </div>
        </div>
      )}

      <CompareDialog
        providers={compareProviders}
        distances={distances}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <RequestDialog
        provider={hireTarget}
        categories={categories}
        defaultCategoryId={categoryId ?? undefined}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </>
  );
}
