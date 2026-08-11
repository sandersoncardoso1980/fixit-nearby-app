import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ShieldAlert, Crown, BadgeCheck, Megaphone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  allAdsQuery,
  categoriesQuery,
  proRequestsQuery,
  providerCategoriesQuery,
  providersQuery,
} from "@/lib/queries";
import { isProActive } from "@/lib/pro";
import { brl, CITY_NAME } from "@/lib/geo";
import type { Ad, Category, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração de profissionais | ServiçoJá" },
      {
        name: "description",
        content:
          "Painel administrativo do ServiçoJá para cadastrar, editar e remover profissionais atendendo Entre Rios de Minas.",
      },
      { property: "og:title", content: "Administração de profissionais | ServiçoJá" },
      {
        property: "og:description",
        content: "Cadastre, edite e remova prestadores de serviço de Entre Rios de Minas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type FormState = {
  full_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  hourly_rate: string;
  is_online: boolean;
  categoryIds: string[];
};

const EMPTY: FormState = {
  full_name: "",
  phone: "",
  bio: "",
  avatar_url: "",
  hourly_rate: "",
  is_online: false,
  categoryIds: [],
};

type AdFormState = {
  advertiser_name: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  phone: string;
  amount_paid: string;
  sort_order: string;
  is_active: boolean;
  expires_at: string;
  category_id: string;
};

const EMPTY_AD: AdFormState = {
  advertiser_name: "",
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  phone: "",
  amount_paid: "",
  sort_order: "0",
  is_active: true,
  expires_at: "",
  category_id: "",
};

type CatFormState = {
  name: string;
  slug: string;
  icon_name: string;
  description: string;
  base_estimated_price: string;
};

const EMPTY_CAT: CatFormState = {
  name: "",
  slug: "",
  icon_name: "Wrench",
  description: "",
  base_estimated_price: "100",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminPage() {
  const { isAdmin, loading, userId } = useAuth();
  const qc = useQueryClient();
  const { data: providers = [], isLoading } = useQuery(providersQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);
  const { data: proRequests = [] } = useQuery(proRequestsQuery);
  const { data: ads = [] } = useQuery(allAdsQuery);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");

  // Anunciantes pagos (carrossel da home)
  const [adOpen, setAdOpen] = useState(false);
  const [adEditing, setAdEditing] = useState<Ad | null>(null);
  const [adForm, setAdForm] = useState<AdFormState>(EMPTY_AD);
  const [adSaving, setAdSaving] = useState(false);
  const [adToDelete, setAdToDelete] = useState<Ad | null>(null);

  // Profissões (categorias)
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<CatFormState>(EMPTY_CAT);
  const [catSaving, setCatSaving] = useState(false);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  useEffect(() => {
    if (!adOpen) return;
    setAdForm(
      adEditing
        ? {
            advertiser_name: adEditing.advertiser_name,
            title: adEditing.title,
            description: adEditing.description ?? "",
            image_url: adEditing.image_url ?? "",
            link_url: adEditing.link_url ?? "",
            phone: adEditing.phone ?? "",
            amount_paid: String(adEditing.amount_paid ?? ""),
            sort_order: String(adEditing.sort_order ?? 0),
            is_active: adEditing.is_active,
            expires_at: adEditing.expires_at ? adEditing.expires_at.slice(0, 10) : "",
          }
        : EMPTY_AD,
    );
  }, [adOpen, adEditing]);

  useEffect(() => {
    if (!catOpen) return;
    setCatForm(
      catEditing
        ? {
            name: catEditing.name,
            slug: catEditing.slug,
            icon_name: catEditing.icon_name,
            description: catEditing.description ?? "",
            base_estimated_price: String(catEditing.base_estimated_price ?? ""),
          }
        : EMPTY_CAT,
    );
  }, [catOpen, catEditing]);

  async function saveAd() {
    if (!adForm.advertiser_name.trim() || !adForm.title.trim()) {
      toast.error("Informe o anunciante e o título do anúncio.");
      return;
    }
    setAdSaving(true);
    try {
      const payload = {
        advertiser_name: adForm.advertiser_name.trim(),
        title: adForm.title.trim(),
        description: adForm.description.trim() || null,
        image_url: adForm.image_url.trim() || null,
        link_url: adForm.link_url.trim() || null,
        phone: adForm.phone.trim() || null,
        amount_paid: adForm.amount_paid ? Number(adForm.amount_paid) : 0,
        sort_order: adForm.sort_order ? Number(adForm.sort_order) : 0,
        is_active: adForm.is_active,
        expires_at: adForm.expires_at ? new Date(`${adForm.expires_at}T23:59:59`).toISOString() : null,
      };
      const { error } = adEditing
        ? await supabase.from("ads").update(payload).eq("id", adEditing.id)
        : await supabase.from("ads").insert(payload);
      if (error) throw error;
      toast.success(adEditing ? "Anúncio atualizado." : "Anúncio criado.");
      void qc.invalidateQueries({ queryKey: ["ads"] });
      setAdOpen(false);
      setAdEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o anúncio.");
    } finally {
      setAdSaving(false);
    }
  }

  async function deleteAd() {
    if (!adToDelete) return;
    const { error } = await supabase.from("ads").delete().eq("id", adToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Anúncio removido.");
      void qc.invalidateQueries({ queryKey: ["ads"] });
    }
    setAdToDelete(null);
  }

  async function saveCategory() {
    if (!catForm.name.trim()) {
      toast.error("Informe o nome da profissão.");
      return;
    }
    setCatSaving(true);
    try {
      const payload = {
        name: catForm.name.trim(),
        slug: (catForm.slug.trim() || slugify(catForm.name)).slice(0, 60),
        icon_name: catForm.icon_name.trim() || "Wrench",
        description: catForm.description.trim() || null,
        base_estimated_price: catForm.base_estimated_price ? Number(catForm.base_estimated_price) : 100,
      };
      const { error } = catEditing
        ? await supabase.from("categories").update(payload).eq("id", catEditing.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
      toast.success(catEditing ? "Profissão atualizada." : "Profissão criada.");
      void qc.invalidateQueries({ queryKey: ["categories"] });
      setCatOpen(false);
      setCatEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a profissão.");
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory() {
    if (!catToDelete) return;
    const { error } = await supabase.from("categories").delete().eq("id", catToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profissão removida.");
      void qc.invalidateQueries({ queryKey: ["categories"] });
      void qc.invalidateQueries({ queryKey: ["provider-categories"] });
    }
    setCatToDelete(null);
  }


  const catsByProvider = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of links) (map[l.provider_id] ??= []).push(l.category_id);
    return map;
  }, [links]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [providers, search]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        full_name: editing.full_name ?? "",
        phone: editing.phone ?? "",
        bio: editing.bio ?? "",
        avatar_url: editing.avatar_url ?? "",
        hourly_rate: editing.hourly_rate == null ? "" : String(editing.hourly_rate),
        is_online: !!editing.is_online,
        categoryIds: catsByProvider[editing.id] ?? [],
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing, catsByProvider]);

  async function setPro(p: Profile, on: boolean) {
    const expires = on ? new Date(Date.now() + 30 * 864e5).toISOString() : null;
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: on, is_verified: on ? true : p.is_verified, pro_expires_at: expires })
      .eq("id", p.id);
    if (error) {
      toast.error("Não foi possível atualizar o PRO.");
      return;
    }
    toast.success(on ? "PRO ativado por 30 dias." : "PRO desativado.");
    refresh();
  }

  async function resolveRequest(id: string, status: "approved" | "rejected", providerId: string) {
    const { error } = await supabase.from("pro_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar a solicitação.");
      return;
    }
    if (status === "approved") {
      const target = providers.find((x) => x.id === providerId);
      if (target) await setPro(target, true);
    }
    void qc.invalidateQueries({ queryKey: ["pro-requests"] });
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["providers"] });
    void qc.invalidateQueries({ queryKey: ["pro-providers"] });
    void qc.invalidateQueries({ queryKey: ["provider-categories"] });
  }

  async function syncCategories(providerId: string, previous: string[], next: string[]) {
    const toAdd = next.filter((id) => !previous.includes(id));
    const toRemove = previous.filter((id) => !next.includes(id));
    if (toRemove.length) {
      const { error } = await supabase
        .from("provider_categories")
        .delete()
        .eq("provider_id", providerId)
        .in("category_id", toRemove);
      if (error) throw error;
    }
    if (toAdd.length) {
      const { error } = await supabase
        .from("provider_categories")
        .insert(toAdd.map((category_id) => ({ provider_id: providerId, category_id })));
      if (error) throw error;
    }
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      toast.error("Informe o nome do profissional.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role: "provider" as const,
        full_name: form.full_name.trim().slice(0, 120),
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        is_online: form.is_online,
        city: CITY_NAME,
      };

      if (editing) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", editing.id);
        if (error) throw error;
        await syncCategories(editing.id, catsByProvider[editing.id] ?? [], form.categoryIds);
        toast.success("Profissional atualizado.");
      } else {
        const { data, error } = await supabase.from("profiles").insert(payload).select("id").single();
        if (error) throw error;
        await syncCategories(data.id, [], form.categoryIds);
        toast.success("Profissional cadastrado.");
      }
      refresh();
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("profiles").delete().eq("id", toDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profissional removido.");
      refresh();
    }
    setToDelete(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-primary">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Área restrita</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {userId
            ? "Sua conta não tem permissão de administrador."
            : "Entre com uma conta de administrador para gerenciar os profissionais."}
        </p>
        <Button asChild variant="brand" className="mt-5">
          <Link to={userId ? "/" : "/auth"}>{userId ? "Voltar ao início" : "Entrar"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de prestadores que atendem {CITY_NAME} (MG).
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Novo profissional
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome"
        className="mt-5 max-w-sm"
      />

      <div className="mt-4 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}

        {!isLoading && filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum profissional cadastrado ainda.
          </p>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft"
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-xl bg-accent text-sm font-bold text-primary">
                {p.full_name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {brl(p.hourly_rate)}/h · {p.rating_avg.toFixed(1)} ★ · {p.city ?? CITY_NAME}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(catsByProvider[p.id] ?? []).map((cid) => (
                  <Badge key={cid} variant="secondary" className="text-[10px]">
                    {categories.find((c) => c.id === cid)?.name ?? "—"}
                  </Badge>
                ))}
                {p.is_online && <Badge className="text-[10px]">Online</Badge>}
                {isProActive(p) && (
                  <Badge className="gap-1 border-0 bg-gradient-hero text-[10px] text-white">
                    <Crown className="size-3" /> PRO
                  </Badge>
                )}
                {p.is_verified && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <BadgeCheck className="size-3" /> Verificado
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <label className="mr-1 hidden items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
                PRO
                <Switch
                  checked={isProActive(p)}
                  onCheckedChange={(v) => void setPro(p, v)}
                  aria-label={`Alternar PRO de ${p.full_name}`}
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${p.full_name}`}
                onClick={() => {
                  setEditing(p);
                  setOpen(true);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${p.full_name}`}
                onClick={() => setToDelete(p)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Solicitações do plano PRO</h2>
        <p className="text-sm text-muted-foreground">
          Confirme o Pix de R$ 19,90 e aprove para ativar o destaque por 30 dias.
        </p>
        <div className="mt-4 space-y-3">
          {proRequests.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma solicitação recebida.
            </p>
          )}
          {proRequests.map((r) => {
            const prov = providers.find((p) => p.id === r.provider_id);
            return (
              <div
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{prov?.full_name ?? "Profissional"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.contact_phone ?? "sem telefone"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.status}
                  </p>
                  {r.message && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.message}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="brand" onClick={() => void resolveRequest(r.id, "approved", r.provider_id)}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void resolveRequest(r.id, "rejected", r.provider_id)}>
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="size-5 text-primary" /> Anunciantes pagos
            </h2>
            <p className="text-sm text-muted-foreground">
              Anúncios exibidos no carrossel da página inicial.
            </p>
          </div>
          <Button
            variant="brand"
            onClick={() => {
              setAdEditing(null);
              setAdOpen(true);
            }}
          >
            <Plus /> Novo anúncio
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {ads.length === 0 && (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum anunciante cadastrado.
            </p>
          )}
          {ads.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft"
            >
              {a.image_url ? (
                <img src={a.image_url} alt="" className="h-12 w-20 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-20 place-items-center rounded-xl bg-accent text-primary">
                  <Megaphone className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.advertiser_name} · {brl(a.amount_paid)} · ordem {a.sort_order}
                  {a.expires_at ? ` · até ${new Date(a.expires_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                    {a.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar anúncio ${a.title}`}
                  onClick={() => {
                    setAdEditing(a);
                    setAdOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir anúncio ${a.title}`}
                  onClick={() => setAdToDelete(a)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Briefcase className="size-5 text-primary" /> Profissões
            </h2>
            <p className="text-sm text-muted-foreground">
              Categorias disponíveis para busca e cadastro de profissionais.
            </p>
          </div>
          <Button
            variant="brand"
            onClick={() => {
              setCatEditing(null);
              setCatOpen(true);
            }}
          >
            <Plus /> Nova profissão
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.slug} · a partir de {brl(c.base_estimated_price)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${c.name}`}
                  onClick={() => {
                    setCatEditing(c);
                    setCatOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${c.name}`}
                  onClick={() => setCatToDelete(c)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={adOpen} onOpenChange={setAdOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{adEditing ? "Editar anúncio" : "Novo anúncio"}</DialogTitle>
            <DialogDescription>Aparece no carrossel da página inicial.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ad-adv">Anunciante</Label>
              <Input
                id="ad-adv"
                value={adForm.advertiser_name}
                onChange={(e) => setAdForm((f) => ({ ...f, advertiser_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ad-title">Título</Label>
              <Input
                id="ad-title"
                value={adForm.title}
                onChange={(e) => setAdForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ad-desc">Descrição</Label>
              <Textarea
                id="ad-desc"
                rows={3}
                value={adForm.description}
                onChange={(e) => setAdForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ad-img">Imagem (URL)</Label>
              <Input
                id="ad-img"
                value={adForm.image_url}
                onChange={(e) => setAdForm((f) => ({ ...f, image_url: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ad-link">Link do anúncio</Label>
                <Input
                  id="ad-link"
                  value={adForm.link_url}
                  onChange={(e) => setAdForm((f) => ({ ...f, link_url: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ad-phone">WhatsApp / telefone</Label>
                <Input
                  id="ad-phone"
                  value={adForm.phone}
                  onChange={(e) => setAdForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ad-paid">Valor pago (R$)</Label>
                <Input
                  id="ad-paid"
                  type="number"
                  min={0}
                  value={adForm.amount_paid}
                  onChange={(e) => setAdForm((f) => ({ ...f, amount_paid: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ad-order">Ordem</Label>
                <Input
                  id="ad-order"
                  type="number"
                  value={adForm.sort_order}
                  onChange={(e) => setAdForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ad-exp">Expira em</Label>
                <Input
                  id="ad-exp"
                  type="date"
                  value={adForm.expires_at}
                  onChange={(e) => setAdForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label htmlFor="ad-active" className="cursor-pointer">
                Anúncio ativo
              </Label>
              <Switch
                id="ad-active"
                checked={adForm.is_active}
                onCheckedChange={(v) => setAdForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdOpen(false)}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={() => void saveAd()} disabled={adSaving}>
              {adSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{catEditing ? "Editar profissão" : "Nova profissão"}</DialogTitle>
            <DialogDescription>
              O ícone usa nomes do Lucide (ex.: Wrench, Hammer, PaintRoller).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cat-name">Nome da profissão</Label>
              <Input
                id="cat-name"
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cat-slug">Identificador (slug)</Label>
                <Input
                  id="cat-slug"
                  placeholder={slugify(catForm.name) || "pedreiro"}
                  value={catForm.slug}
                  onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cat-icon">Ícone</Label>
                <Input
                  id="cat-icon"
                  value={catForm.icon_name}
                  onChange={(e) => setCatForm((f) => ({ ...f, icon_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cat-price">Preço estimado base (R$)</Label>
              <Input
                id="cat-price"
                type="number"
                min={0}
                value={catForm.base_estimated_price}
                onChange={(e) => setCatForm((f) => ({ ...f, base_estimated_price: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cat-desc">Descrição</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={catForm.description}
                onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatOpen(false)}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={() => void saveCategory()} disabled={catSaving}>
              {catSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!adToDelete} onOpenChange={(o) => !o && setAdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              {adToDelete?.title} deixará de aparecer no carrossel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteAd()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!catToDelete} onOpenChange={(o) => !o && setCatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissão?</AlertDialogTitle>
            <AlertDialogDescription>
              {catToDelete?.name} será removida da lista de categorias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteCategory()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar profissional" : "Novo profissional"}</DialogTitle>
            <DialogDescription>Todos os profissionais atendem {CITY_NAME} (MG).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="tel">Telefone</Label>
                <Input
                  id="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="valor">Valor por hora (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  min={0}
                  value={form.hourly_rate}
                  onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="foto">Foto (URL)</Label>
              <Input
                id="foto"
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bio">Descrição</Label>
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Categorias</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          categoryIds: active
                            ? f.categoryIds.filter((id) => id !== c.id)
                            : [...f.categoryIds, c.id],
                        }))
                      }
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label htmlFor="online" className="cursor-pointer">
                Disponível agora
              </Label>
              <Switch
                id="online"
                checked={form.is_online}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_online: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.full_name} será removido definitivamente do ServiçoJá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
