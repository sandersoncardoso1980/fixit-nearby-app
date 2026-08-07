import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, Scale, X, ShieldCheck, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProviderCard } from "@/components/ProviderCard";
import { CompareDialog } from "@/components/CompareDialog";
import { PriceCalculator } from "@/components/PriceCalculator";
import { RequestDialog } from "@/components/RequestDialog";
import { categoriesQuery, providerCategoriesQuery, providersQuery } from "@/lib/queries";
import { CITY_LABEL, CITY_NAME } from "@/lib/geo";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiçoJá — Profissionais em Entre Rios de Minas" },
      {
        name: "description",
        content:
          "Pedreiros, pintores, eletricistas, encanadores, marceneiros, diaristas e mais em Entre Rios de Minas. Compare preço e avaliação e contrate em minutos.",
      },
      { property: "og:title", content: "ServiçoJá — Profissionais em Entre Rios de Minas" },
      {
        property: "og:description",
        content: "Compare preço e avaliação de prestadores locais e contrate em minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type SortKey = "rating" | "price" | "jobs" | "online";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Melhor avaliado" },
  { key: "price", label: "Menor preço/hora" },
  { key: "jobs", label: "Mais experiente" },
  { key: "online", label: "Disponível agora" },
];

function Home() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: providers = [], isLoading } = useQuery(providersQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);

  const [search, setSearch] = useState("");
  const city = CITY_LABEL;
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("rating");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<Profile | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const catsByProvider = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of links) (map[l.provider_id] ??= []).push(l.category_id);
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = providers.filter((p) => {
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
      if (sort === "jobs") return b.jobs_done - a.jobs_done;
      return b.rating_avg - a.rating_avg;
    });
  }, [providers, categoryId, catsByProvider, sort, search, categories]);

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
            Profissionais verificados da cidade
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
              <span className="truncate text-sm font-medium">{city}</span>
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

      {/* Resultados */}
      <section id="resultados" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Prestadores em {CITY_NAME} ({filtered.length})
              </p>
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
                Nenhum profissional encontrado com esses filtros.
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <PriceCalculator categories={categories} />
            <div className="rounded-2xl border bg-card p-4 shadow-soft">
              <h3 className="text-sm font-semibold">Não sabe quem chamar?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Publique um chamado aberto e receba propostas dos prestadores da cidade.
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

      <CompareDialog providers={compareProviders} open={compareOpen} onOpenChange={setCompareOpen} />
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
