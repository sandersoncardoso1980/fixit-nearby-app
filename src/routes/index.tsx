import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Scale,
  X,
  ShieldCheck,
  Clock,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProviderCard } from "@/components/ProviderCard";
import { ProBanner } from "@/components/ProBanner";
import { CompareDialog } from "@/components/CompareDialog";
import { PriceCalculator } from "@/components/PriceCalculator";
import {
  activeAdsQuery,
  categoriesQuery,
  proProvidersQuery,
  providerCategoriesQuery,
  providersQuery,
} from "@/lib/queries";
import { isProActive } from "@/lib/pro";
import { CITY_LABEL, CITY_NAME } from "@/lib/geo";
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

const CAROUSEL_ITEMS = [
  {
    id: "fallback-1",
    title: "Promoção Especial de Lançamento",
    description: "Contrate um profissional PRO verificado e ganhe 10% de desconto na primeira hora de serviço.",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=600&fit=crop",
    cta: "Garantir Desconto",
    link: "/pro",
    tag: "Oferta Limitada",
  },
  {
    id: "fallback-2",
    title: "Segurança e Qualidade Checadas",
    description: "Todos os profissionais passam por verificação rigorosa de identidade e histórico profissional.",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=600&fit=crop",
    cta: "Conhecer Garantias",
    link: "/pro",
    tag: "Verificados",
  },
  {
    id: "fallback-3",
    title: "Aumente seus Clientes com o Plano PRO",
    description: "Destaque seu trabalho na tela inicial de Entre Rios de Minas a partir de R$ 19,90/mês.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop",
    cta: "Seja um Profissional PRO",
    link: "/pro",
    tag: "Para Prestadores",
  },
];

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function Home() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: providers = [], isLoading } = useQuery(providersQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);
  const { data: proProviders = [] } = useQuery(proProvidersQuery);
  const { data: ads = [] } = useQuery(activeAdsQuery);

  const [search, setSearch] = useState("");
  const city = CITY_LABEL;
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("rating");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const filteredAds = useMemo(
    () => ads.filter((a) => !categoryId || !a.category_id || a.category_id === categoryId),
    [ads, categoryId]
  );

  const slides = useMemo(() => {
    if (!filteredAds.length) return CAROUSEL_ITEMS;
    return filteredAds.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description ?? "",
      image:
        a.image_url ||
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=600&fit=crop",
      cta: a.link_url ? "Saiba mais" : a.advertiser_name ?? "Ver mais",
      link: a.link_url ?? "#",
      tag: "Destaque",
    }));
  }, [filteredAds]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  const handleUserInteraction = useCallback(() => {
    setIsAutoPlaying(false);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 6000);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    handleUserInteraction();
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    handleUserInteraction();
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    handleUserInteraction();
  };

  const checkArrowsVisibility = useCallback(() => {
    if (categoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesScrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 280;
      const currentScroll = categoriesScrollRef.current.scrollLeft;
      const newScroll =
        direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount;

      categoriesScrollRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkArrowsVisibility();
    window.addEventListener("resize", checkArrowsVisibility);
    return () => window.removeEventListener("resize", checkArrowsVisibility);
  }, [categories, checkArrowsVisibility]);

  const catsByProvider = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of links) {
      if (l?.provider_id && l?.category_id) {
        (map[l.provider_id] ??= []).push(l.category_id);
      }
    }
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const term = normalizeText(search.trim());
    const searchTerms = term.split(/\s+/).filter(Boolean);

    const list = providers.filter((p) => {
      if (categoryId && !(catsByProvider[p.id] ?? []).includes(categoryId)) return false;
      if (sort === "online" && !p.is_online) return false;

      if (searchTerms.length > 0) {
        const providerCatObjects = (catsByProvider[p.id] ?? [])
          .map((id) => categories.find((c) => c.id === id))
          .filter(Boolean);

        const categoryNames = providerCatObjects.map((c) => c?.name).join(" ");
        const categoryDescriptions = providerCatObjects.map((c) => c?.description).join(" ");

        const searchableHaystack = normalizeText(
          `${p.full_name ?? ""} ${p.bio ?? ""} ${p.city ?? ""} ${categoryNames} ${categoryDescriptions}`
        );

        const matches = searchTerms.every((t) => searchableHaystack.includes(t));
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const proDiff = Number(isProActive(b)) - Number(isProActive(a));
      if (proDiff !== 0) return proDiff;
      if (sort === "price") return (a.hourly_rate ?? 1e9) - (b.hourly_rate ?? 1e9);
      if (sort === "jobs") return (b.jobs_done ?? 0) - (a.jobs_done ?? 0);
      return (b.rating_avg ?? 0) - (a.rating_avg ?? 0);
    });
  }, [providers, categoryId, catsByProvider, sort, search, categories]);

  const compareProviders = useMemo(() => {
    return providers.filter((p) => compare.includes(p.id));
  }, [providers, compare]);

  function toggleCompare(id: string) {
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  }

  return (
    <>
      {/* HERO SECTION + BUSCA INTEGRADAS */}
      <section className="bg-slate-950 text-white pt-8 pb-10 sm:pt-12 sm:pb-16 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-primary/20 blur-[120px] pointer-events-none rounded-full" />

        <div className="mx-auto max-w-6xl px-3 sm:px-4 relative z-10 space-y-5 sm:space-y-6">

          {/* Header do Hero (texto reduzido) */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge className="border-primary/30 bg-primary/10 text-primary-foreground hover:bg-primary/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full inline-flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" /> Profissionais verificados da cidade
            </Badge>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              Um profissional de confiança, <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                a poucos minutos de você.
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
              Descreva o serviço, compare orçamentos e contrate os melhores prestadores locais sem complicação.
            </p>
          </div>

          {/* CARROSSEL DE ANÚNCIOS / PROMOÇÕES */}
          <div>
            <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              
              {/* Slides Container */}
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {slides.map((item) => {
                  const isExternal = item.link.startsWith("http") || item.link.startsWith("#");

                  return (
                    <div key={item.id} className="min-w-full relative h-[220px] sm:h-[280px] md:h-[340px] flex items-center">
                      
                      {/* Imagem de Fundo com Tratamento de Luz */}
                      <img
                        src={item.image}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 group-hover:scale-100"
                        loading="lazy"
                      />
                      
                      {/* Gradient Overlay escuro para legibilidade perfeita do texto */}
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent w-full md:w-4/5" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

                      {/* Conteúdo do Banner */}
                      <div className="relative z-10 p-5 sm:p-8 md:p-12 max-w-xl text-white space-y-2 sm:space-y-3">
                        {item.tag && (
                          <Badge className="bg-primary hover:bg-primary text-primary-foreground border-none text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {item.tag}
                          </Badge>
                        )}
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight drop-shadow-md">
                          {item.title}
                        </h2>
                        <p className="text-xs sm:text-sm md:text-base text-slate-200 line-clamp-2 drop-shadow">
                          {item.description}
                        </p>
                        
                        <div className="pt-2">
                          {isExternal ? (
                            <a href={item.link} target={item.link.startsWith("http") ? "_blank" : "_self"} rel="noreferrer">
                              <Button
                                size="sm"
                                className="text-xs sm:text-sm font-semibold gap-2 shadow-lg hover:gap-3 transition-all"
                              >
                                {item.cta} <ArrowRight className="size-4" />
                              </Button>
                            </a>
                          ) : (
                            <Link to={item.link}>
                              <Button
                                size="sm"
                                className="text-xs sm:text-sm font-semibold gap-2 shadow-lg hover:gap-3 transition-all"
                              >
                                {item.cta} <ArrowRight className="size-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botões do Carrossel (Visíveis no Hover/Mobile) */}
              <button
                onClick={goToPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-all opacity-80 hover:opacity-100 border border-white/10"
                aria-label="Slide anterior"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full backdrop-blur-md transition-all opacity-80 hover:opacity-100 border border-white/10"
                aria-label="Próximo slide"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Pílulas Indicadoras Rápidas */}
              <div className="absolute bottom-4 right-4 sm:right-8 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentSlide === index ? "bg-primary w-6" : "bg-white/40 w-2 hover:bg-white/70"
                    )}
                    aria-label={`Ir para slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* BARRA DE BUSCA PRINCIPAL */}
          <div className="max-w-4xl mx-auto">
            <div className="p-1.5 sm:p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/20">
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center bg-card rounded-xl p-2 text-foreground shadow-inner">
                
                {/* Input de texto */}
                <div className="flex items-center gap-2 px-3 py-1">
                  <Search className="size-5 text-muted-foreground shrink-0" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="O que você precisa hoje? (ex: pintor, eletricista, vazamento...)"
                    className="border-0 bg-transparent px-0 text-sm sm:text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Localização */}
                <div className="flex items-center gap-2 px-3 py-2 border-t sm:border-t-0 sm:border-l border-border/60 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold whitespace-nowrap text-foreground">{city}</span>
                </div>

                {/* Botão de busca */}
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full sm:w-auto px-6 font-semibold shadow-md hover:shadow-primary/25 transition-all"
                  onClick={() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Micro Badges abaixo da Busca */}
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" /> Profissionais avaliados
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="size-4 text-blue-400" /> Resposta rápida
              </li>
              <li className="flex items-center gap-1.5">
                <Wallet className="size-4 text-amber-400" /> Sem taxas ocultas
              </li>
            </ul>
          </div>

        </div>
      </section>

      <ProBanner
        providers={
          !categoryId
            ? proProviders
            : proProviders.filter((p) => (catsByProvider[p.id] ?? []).includes(categoryId))
        }
        categories={categories}
        links={links}
      />

      {/* CARROSSEL DE CATEGORIAS */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Categorias em Destaque</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Encontre o especialista ideal para o seu problema</p>
          </div>
          <div className="flex gap-1.5">
            {showLeftArrow && (
              <button
                onClick={() => scrollCategories("left")}
                className="p-2 rounded-full bg-accent hover:bg-accent/80 transition-colors border shadow-sm"
                aria-label="Categorias anteriores"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {showRightArrow && (
              <button
                onClick={() => scrollCategories("right")}
                className="p-2 rounded-full bg-accent hover:bg-accent/80 transition-colors border shadow-sm"
                aria-label="Próximas categorias"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div
          ref={categoriesScrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scroll-smooth hide-scrollbar"
          onScroll={checkArrowsVisibility}
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(active ? null : c.id)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md w-[145px] sm:w-[165px] md:w-[180px]",
                  active && "border-primary ring-2 ring-primary/20 bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-xl transition-colors",
                    active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  <CategoryIcon name={c.icon_name} className="size-5" />
                </span>
                <div>
                  <span className="text-xs sm:text-sm font-bold block line-clamp-1">{c.name}</span>
                  <span className="text-[10px] sm:text-[11px] leading-snug text-muted-foreground mt-0.5 block">
                    A partir de R$ {c.base_estimated_price}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RESULTADOS */}
      <section id="resultados" className="mx-auto max-w-6xl px-3 sm:px-4 pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <p className="text-base font-bold text-foreground">
                Prestadores em {CITY_NAME} <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
              </p>
              {categoryId && (
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold hover:bg-accent/80 border"
                >
                  {categories.find((c) => c.id === categoryId)?.name}
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Ordenação */}
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground whitespace-nowrap mr-1">
                <SlidersHorizontal className="size-3.5" /> Ordenar por:
              </span>
              {SORTS.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={sort === s.key ? "default" : "outline"}
                  onClick={() => setSort(s.key)}
                  className="text-xs rounded-full h-8"
                >
                  {s.label}
                </Button>
              ))}
            </div>

            {/* Grid de Prestadores */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
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
                      (catsByProvider[p.id] ?? []).includes(c.id)
                    )}
                    selected={compare.includes(p.id)}
                    onToggleCompare={() => toggleCompare(p.id)}
                  />
                ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground bg-accent/20">
                Nenhum profissional encontrado com esses filtros. Tente alterar o termo de busca.
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <PriceCalculator categories={categories} />
            
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-white shadow-md space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Para Prestadores</span>
              <h3 className="text-base font-bold">É profissional? Seja PRO</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ganhe destaque na tela inicial, selo de verificado e receba chamados prioritários.
              </p>
              <Link to="/pro" className="block pt-2">
                <Button className="w-full font-semibold" variant="secondary" size="sm">
                  Conhecer o plano PRO
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Como funciona?</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Escolha o profissional e entre em contato diretamente via WhatsApp em {CITY_NAME}. Sem intermediários ou taxas adicionais.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* BARRA DE COMPARAÇÃO FIXA */}
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              {compareProviders.map((p) => (
                <span
                  key={p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent border py-1 pl-1 pr-2.5 text-xs font-medium"
                >
                  <img
                    src={p.avatar_url ?? ""}
                    alt={p.full_name ?? "Prestador"}
                    className="size-6 rounded-full object-cover"
                  />
                  <span>{p.full_name?.split(" ")[0]}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                    aria-label={`Remover ${p.full_name}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <Button
              variant="brand"
              onClick={() => setCompareOpen(true)}
              disabled={compare.length < 2}
              size="sm"
              className="text-xs sm:text-sm font-semibold"
            >
              <Scale className="size-4 mr-1.5" /> Comparar ({compare.length}/3)
            </Button>
          </div>
        </div>
      )}

      <CompareDialog providers={compareProviders} open={compareOpen} onOpenChange={setCompareOpen} />
    </>
  );
}
