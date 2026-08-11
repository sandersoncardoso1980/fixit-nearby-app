import { useMemo, useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, Scale, X, ShieldCheck, Clock, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProviderCard } from "@/components/ProviderCard";
import { ProBanner } from "@/components/ProBanner";
import { CompareDialog } from "@/components/CompareDialog";
import { PriceCalculator } from "@/components/PriceCalculator";
import { RequestDialog } from "@/components/RequestDialog";
import { activeAdsQuery, categoriesQuery, proProvidersQuery, providerCategoriesQuery, providersQuery } from "@/lib/queries";
import { isProActive } from "@/lib/pro";
import { supabase } from "@/integrations/supabase/client";
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

// Slides de fallback quando ainda não há anunciantes cadastrados
const CAROUSEL_ITEMS = [
  {
    id: "fallback-1",
    title: "Promoção Especial!",
    description: "Contrate um profissional PRO e ganhe 10% de desconto na primeira hora",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=400&fit=crop",
    cta: "Ver ofertas",
    link: "/pro",
    color: "from-blue-600 to-purple-600",
  },
  {
    id: "fallback-2",
    title: "Profissionais Verificados",
    description: "Todos os profissionais passam por verificação de identidade e qualidade",
    image: "https://images.unsplash.com/photo-1521791136064-7986c0212926?w=800&h=400&fit=crop",
    cta: "Saiba mais",
    link: "/pro",
    color: "from-green-600 to-teal-600",
  },
  {
    id: "fallback-3",
    title: "Plano PRO para Profissionais",
    description: "Destaque-se na plataforma e receba mais clientes. A partir de R$ 19,90/mês",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop",
    cta: "Assinar PRO",
    link: "/pro",
    color: "from-purple-600 to-pink-600",
  },
];

const AD_COLORS = [
  "from-blue-600 to-purple-600",
  "from-green-600 to-teal-600",
  "from-orange-600 to-red-600",
  "from-purple-600 to-pink-600",
];

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
  const [hireTarget, setHireTarget] = useState<Profile | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  // Anúncios filtrados pela profissão selecionada (category_id null = geral)
  const filteredAds = useMemo(
    () => ads.filter((a) => !categoryId || !a.category_id || a.category_id === categoryId),
    [ads, categoryId],
  );

  const slides = useMemo(() => {
    if (!filteredAds.length) return CAROUSEL_ITEMS;
    return filteredAds.map((a, i) => ({
      id: a.id,
      title: a.title,
      description: a.description ?? "",
      image:
        a.image_url ||
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=400&fit=crop",
      cta: a.link_url ? "Saiba mais" : a.advertiser_name,
      link: a.link_url ?? "#",
      color: AD_COLORS[i % AD_COLORS.length]!,
    }));
  }, [filteredAds]);
  
  // Estado do carrossel principal
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Estado do carrossel de categorias
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Auto-play do carrossel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides.length]);

  // Pausar auto-play quando o usuário interage
  const handleUserInteraction = () => {
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  // Navegação do carrossel principal
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

  // Funções para rolagem horizontal das categorias
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 280;
      const currentScroll = categoriesScrollRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      categoriesScrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
  };

  // Verificar visibilidade das setas
  const checkArrowsVisibility = () => {
    if (categoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesScrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  // Atualizar setas quando a tela for redimensionada
  useEffect(() => {
    checkArrowsVisibility();
    window.addEventListener('resize', checkArrowsVisibility);
    return () => window.removeEventListener('resize', checkArrowsVisibility);
  }, [categories]);

  // Atualizar setas quando as categorias mudarem
  useEffect(() => {
    setTimeout(checkArrowsVisibility, 100);
  }, [categories]);

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
      const proDiff = Number(isProActive(b)) - Number(isProActive(a));
      if (proDiff !== 0) return proDiff;
      if (sort === "price") return (a.hourly_rate ?? 1e9) - (b.hourly_rate ?? 1e9);
      if (sort === "jobs") return b.jobs_done - a.jobs_done;
      return b.rating_avg - a.rating_avg;
    });
  }, [providers, categoryId, catsByProvider, sort, search, categories]);

  const compareProviders = providers.filter((p) => compare.includes(p.id));

  function startHire(p: Profile | null) {
    setHireTarget(p);
    setRequestOpen(true);
    // Removida chamada RPC que causava erro
  }

  function toggleCompare(id: string) {
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-gradient-hero text-white">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-12 md:py-20">
          <Badge className="mb-3 sm:mb-4 border-0 bg-white/15 text-white hover:bg-white/15 text-xs sm:text-sm">
            Profissionais verificados da cidade
          </Badge>
          <h1 className="max-w-2xl text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight">
            Um profissional de confiança, a poucos minutos de você.
          </h1>
          <p className="mt-2 sm:mt-3 max-w-xl text-xs sm:text-sm md:text-base text-white/80">
            Descreva o problema, compare orçamentos e acompanhe o serviço do pedido à conclusão.
          </p>

          <div className="mt-5 sm:mt-7 grid gap-2 rounded-2xl bg-card p-2 shadow-lift grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]">
            <div className="flex min-w-0 items-center gap-2 rounded-xl px-2 sm:px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qual serviço você precisa?"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-sm"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl px-2 sm:px-3 sm:border-l">
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs sm:text-sm font-medium">{city}</span>
            </div>
            <Button
              variant="brand"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" })}
            >
              Buscar
            </Button>
          </div>

          <ul className="mt-4 sm:mt-6 flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 text-[10px] sm:text-xs text-white/80">
            <li className="flex items-center gap-1 sm:gap-1.5">
              <ShieldCheck className="size-3 sm:size-4" /> Profissionais avaliados
            </li>
            <li className="flex items-center gap-1 sm:gap-1.5">
              <Clock className="size-3 sm:size-4" /> Resposta em até 15 min
            </li>
            <li className="flex items-center gap-1 sm:gap-1.5">
              <Wallet className="size-3 sm:size-4" /> Orçamento sem compromisso
            </li>
          </ul>
        </div>
      </section>

      {/* CARROSSEL DE ANÚNCIOS - VERSÃO COMPACTADA */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 -mt-1 sm:-mt-2 relative z-10">
        <div 
          ref={carouselRef}
          className="relative overflow-hidden rounded-lg sm:rounded-xl shadow-md" // Border-radius reduzido
        >
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((item) => (
              <div
                key={item.id}
                className="min-w-full relative h-[140px] sm:h-[180px] md:h-[220px]" // Altura reduzida
              >
                <div className="absolute inset-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-40`} />
                </div>
                
                <div className="absolute inset-0 flex items-center p-3 sm:p-4 md:p-6"> {/* Padding reduzido */}
                  <div className="max-w-sm sm:max-w-md text-white"> {/* Largura máxima reduzida */}
                    <h2 className="text-sm sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1.5"> {/* Tamanho da fonte reduzido */}
                      {item.title}
                    </h2>
                    <p className="text-[10px] sm:text-xs md:text-sm text-white/90 mb-2 sm:mb-3 line-clamp-2"> {/* Texto menor e com limite */}
                      {item.description}
                    </p>
                    <Button 
                      size="sm" 
                      className="text-[10px] sm:text-xs h-7 sm:h-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30" // Botão menor
                    >
                      {item.cta} →
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicadores de slide - menores */}
          <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full transition-all duration-300", // Indicadores menores
                  currentSlide === index 
                    ? "bg-white w-2 sm:w-3" 
                    : "bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Botões de navegação - menores e mais discretos */}
          <button
            onClick={goToPrev}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-0.5 sm:p-1.5 rounded-full backdrop-blur-sm transition-all hidden sm:block"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="size-3 sm:size-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-0.5 sm:p-1.5 rounded-full backdrop-blur-sm transition-all hidden sm:block"
            aria-label="Próximo slide"
          >
            <ChevronRight className="size-3 sm:size-4" />
          </button>
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
        onHire={(p) => startHire(p)}
      />

      {/* CARROSSEL DE CATEGORIAS - COM ROLAGEM HORIZONTAL */}
      <section className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-bold">Categorias</h2>
          <div className="flex gap-1 sm:gap-2">
            {showLeftArrow && (
              <button
                onClick={() => scrollCategories('left')}
                className="p-1 sm:p-2 rounded-full bg-accent hover:bg-accent/80 transition-colors"
                aria-label="Categorias anteriores"
              >
                <ChevronLeft className="size-4 sm:size-5" />
              </button>
            )}
            {showRightArrow && (
              <button
                onClick={() => scrollCategories('right')}
                className="p-1 sm:p-2 rounded-full bg-accent hover:bg-accent/80 transition-colors"
                aria-label="Próximas categorias"
              >
                <ChevronRight className="size-4 sm:size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Container com scroll horizontal */}
        <div 
          ref={categoriesScrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scroll-smooth hide-scrollbar"
          onScroll={checkArrowsVisibility}
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(active ? null : c.id)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-start gap-1.5 sm:gap-2 rounded-2xl border bg-card p-3 sm:p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift w-[140px] sm:w-[160px] md:w-[180px]",
                  active && "border-primary bg-accent",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 sm:size-10 place-items-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                  )}
                >
                  <CategoryIcon name={c.icon_name} className="size-4 sm:size-5" />
                </span>
                <span className="text-xs sm:text-sm font-semibold line-clamp-1">{c.name}</span>
                <span className="text-[10px] sm:text-[11px] leading-snug text-muted-foreground">
                  a partir de R$ {c.base_estimated_price}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Resultados */}
      <section id="resultados" className="mx-auto max-w-6xl px-3 sm:px-4 pb-12 sm:pb-16">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Prestadores em {CITY_NAME} ({filtered.length})
              </p>
              {categoryId && (
                <button
                  type="button"
                  onClick={() => setCategoryId(null)}
                  className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium hover:bg-accent/70"
                >
                  {categories.find((c) => c.id === categoryId)?.name}
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-0">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
                <SlidersHorizontal className="size-3.5" /> Ordenar
              </span>
              {SORTS.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={sort === s.key ? "default" : "soft"}
                  onClick={() => setSort(s.key)}
                  className="text-xs whitespace-nowrap"
                >
                  {s.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
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
                    onHire={() => startHire(p)}
                  />
                ))}
            </div>

            {!isLoading && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed p-8 sm:p-10 text-center text-sm text-muted-foreground">
                Nenhum profissional encontrado com esses filtros.
              </div>
            )}
          </div>

          <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-20 lg:self-start">
            <PriceCalculator categories={categories} />
            <div className="rounded-2xl border border-brand/40 bg-gradient-hero p-3 sm:p-4 text-white shadow-soft">
              <h3 className="text-sm font-semibold">É profissional? Seja PRO</h3>
              <p className="mt-1 text-xs text-white/85">
                Destaque na tela inicial, selo de verificado e prioridade nas buscas por R$ 19,90/mês.
              </p>
              <a href="/pro">
                <Button className="mt-3 w-full" variant="secondary" size="sm">
                  Conhecer o plano PRO
                </Button>
              </a>
            </div>
            <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-soft">
              <h3 className="text-sm font-semibold">Não sabe quem chamar?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Publique um chamado aberto e receba propostas dos prestadores da cidade.
              </p>
              <Button
                className="mt-3 w-full text-xs sm:text-sm"
                variant="outline"
                size="sm"
                onClick={() => startHire(null)}
              >
                Publicar chamado aberto
              </Button>
            </div>
          </aside>
        </div>
      </section>

      {/* Barra de comparação */}
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-2 sm:p-3 shadow-lift backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto">
              {compareProviders.map((p) => (
                <span
                  key={p.id}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent py-0.5 sm:py-1 pl-0.5 sm:pl-1 pr-1.5 sm:pr-2 text-[10px] sm:text-xs"
                >
                  <img 
                    src={p.avatar_url ?? ""} 
                    alt="" 
                    className="size-5 sm:size-6 rounded-full object-cover" 
                  />
                  <span className="hidden xs:inline">{p.full_name.split(" ")[0]}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
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
              className="text-xs sm:text-sm"
            >
              <Scale className="size-3 sm:size-4 mr-1" /> Comparar ({compare.length}/3)
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
