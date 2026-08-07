import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ShieldAlert } from "lucide-react";
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
import { categoriesQuery, providerCategoriesQuery, providersQuery } from "@/lib/queries";
import { brl, CITY_NAME } from "@/lib/geo";
import type { Profile } from "@/lib/types";
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

function AdminPage() {
  const { isAdmin, loading, userId } = useAuth();
  const qc = useQueryClient();
  const { data: providers = [], isLoading } = useQuery(providersQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: links = [] } = useQuery(providerCategoriesQuery);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");

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

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["providers"] });
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
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
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
