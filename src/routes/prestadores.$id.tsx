import { useEffect } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Clock, Crown, Eye, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/StarRating";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { categoriesQuery, providerCategoriesQuery, providerQuery, reviewsQuery } from "@/lib/queries";
import { brl, CITY_LABEL } from "@/lib/geo";
import { isProActive } from "@/lib/pro";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://fixit-nearby-app.lovable.app";

export const Route = createFileRoute("/prestadores/$id")({
  loader: async ({ context, params }) => {
    const [provider, cats, links] = await Promise.all([
      context.queryClient.ensureQueryData(providerQuery(params.id)),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(providerCategoriesQuery),
    ]);
    if (!provider) return { provider: null, categoryName: null };
    const cat = cats.find((c) =>
      links.some((l) => l.provider_id === provider.id && l.category_id === c.id),
    );
    return {
      provider: {
        name: provider.full_name,
        bio: provider.bio ?? null,
        avatar: provider.avatar_url ?? null,
        rating: provider.rating_avg,
        reviews: provider.total_reviews,
        jobs: provider.jobs_done,
      },
      categoryName: cat?.name ?? null,
    };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/prestadores/${params.id}`;
    const p = loaderData?.provider;
    if (!p) {
      return {
        meta: [
          { title: "Profissional não encontrado — ServiçoJá" },
          {
            name: "description",
            content:
              "Este perfil não está disponível. Veja outros profissionais em Entre Rios de Minas na ServiçoJá.",
          },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const cat = loaderData?.categoryName ?? "Profissional";
    const title = `${p.name} — ${cat} em Entre Rios de Minas`.slice(0, 60);
    const description = (
      p.bio?.trim()
        ? `${p.name}, ${cat} em Entre Rios de Minas. ${p.bio.trim()}`
        : `${p.name} é ${cat} em Entre Rios de Minas, com nota ${p.rating.toFixed(1)} em ${p.reviews} avaliações e ${p.jobs} serviços concluídos. Peça um orçamento.`
    ).slice(0, 158);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        ...(p.avatar?.startsWith("https://")
          ? [
              { property: "og:image", content: p.avatar },
              { name: "twitter:image", content: p.avatar },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: p.name,
            description,
            ...(p.avatar ? { image: p.avatar } : {}),
            url,
            areaServed: "Entre Rios de Minas, MG",
            ...(p.reviews > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: p.rating,
                    reviewCount: p.reviews,
                  },
                }
              : {}),
          }),
        },
      ],
    };
  },
  component: ProviderProfile,
});

function ProviderProfile() {
  const { id } = useParams({ from: "/prestadores/$id" });
  const { data: provider, isLoading } = useQuery(providerQuery(id));
  const { data: reviews = [] } = useQuery(reviewsQuery(id));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);

  useEffect(() => {
    void supabase.rpc("register_profile_view", { _provider_id: id });
  }, [id]);

  if (isLoading) return <Skeleton className="mx-4 my-10 h-96 rounded-2xl" />;
  if (!provider)
    return <p className="px-4 py-20 text-center text-muted-foreground">Profissional não encontrado.</p>;

  const pro = isProActive(provider);
  const cats = categories.filter((c) =>
    links.some((l) => l.provider_id === provider.id && l.category_id === c.id),
  );

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
              {provider.is_verified && <BadgeCheck className="size-4 shrink-0 text-brand" />}
            </h1>
            {pro && (
              <Badge className="mt-1 gap-1 border-0 bg-gradient-hero text-white">
                <Crown className="size-3" /> PRO — recomendado
              </Badge>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <StarRating value={provider.rating_avg} size={14} /> {provider.rating_avg.toFixed(1)} (
                {provider.total_reviews})
              </span>
              <span className="flex items-center gap-1">{CITY_LABEL}</span>
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

        {pro && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <p className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" /> Visualizações
              </span>
              <strong className="mt-0.5 block text-lg text-foreground">{provider.profile_views}</strong>
            </p>
            <p className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> Contatos recebidos
              </span>
              <strong className="mt-0.5 block text-lg text-foreground">{provider.contact_count}</strong>
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t pt-4">
          <p className="min-w-0 truncate text-sm">
            <span className="text-lg font-extrabold">{brl(provider.hourly_rate)}</span>
            <span className="text-muted-foreground"> /hora</span>
          </p>
          <WhatsAppButton
            provider={provider}
            categoryName={cats[0]?.name ?? null}
            size="default"
            label="Solicitar orçamento no WhatsApp"
          />
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

    </div>
  );
}
