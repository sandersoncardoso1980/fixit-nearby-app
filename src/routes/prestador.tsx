import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, MessageSquare, TrendingUp, Star, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatDialog } from "@/components/ChatDialog";
import { StatusTimeline } from "@/components/StatusTimeline";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, openRequestsQuery, providerJobsQuery } from "@/lib/queries";
import { brl } from "@/lib/geo";
import { STATUS_LABEL, type RequestStatus, type ServiceRequest } from "@/lib/types";

export const Route = createFileRoute("/prestador")({
  head: () => ({
    meta: [
      { title: "Painel do prestador — ServiçoJá" },
      {
        name: "description",
        content: "Fique online, receba chamados próximos, aceite serviços e acompanhe seus ganhos.",
      },
      { property: "og:title", content: "Painel do prestador — ServiçoJá" },
      { property: "og:description", content: "Receba chamados, aceite serviços e acompanhe ganhos." },
    ],
  }),
  component: PrestadorPanel,
});

const NEXT_STATUS: Partial<Record<RequestStatus, { next: RequestStatus; label: string }>> = {
  accepted: { next: "in_progress", label: "Iniciar serviço" },
  in_progress: { next: "completed", label: "Concluir serviço" },
};

function PrestadorPanel() {
  const { profile, loading, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery(providerJobsQuery(profile?.id));
  const { data: open = [] } = useQuery(openRequestsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [chat, setChat] = useState<ServiceRequest | null>(null);

  if (!loading && (!profile || profile.role !== "provider")) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
          <Briefcase className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold">Área exclusiva de prestadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie uma conta como prestador para receber chamados na sua região.
        </p>
        <Button variant="brand" className="mt-5" asChild>
          <Link to="/auth">Quero oferecer serviços</Link>
        </Button>
      </div>
    );
  }

  const active = jobs.filter((j) => j.status === "accepted" || j.status === "in_progress");
  const done = jobs.filter((j) => j.status === "completed");
  const earnings = done.reduce((sum, j) => sum + (j.agreed_price ?? 0), 0);

  async function toggleOnline(v: boolean) {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ is_online: v }).eq("id", profile.id);
    if (error) {
      toast.error("Não foi possível atualizar seu status.");
      return;
    }
    await refreshProfile();
    toast.success(v ? "Você está online e visível para clientes." : "Você ficou offline.");
  }

  async function accept(r: ServiceRequest) {
    if (!profile) return;
    const { error } = await supabase
      .from("service_requests")
      .update({ provider_id: profile.id, status: "accepted" })
      .eq("id", r.id);
    if (error) {
      toast.error("Este chamado já foi aceito por outro profissional.");
      return;
    }
    toast.success("Chamado aceito! Fale com o cliente pelo chat.");
    void qc.invalidateQueries({ queryKey: ["open-requests"] });
    void qc.invalidateQueries({ queryKey: ["provider-jobs"] });
  }

  async function advance(r: ServiceRequest, next: RequestStatus) {
    const { error } = await supabase.from("service_requests").update({ status: next }).eq("id", r.id);
    if (error) {
      toast.error("Não foi possível atualizar o serviço.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["provider-jobs"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">
            Olá, {profile?.full_name.split(" ")[0] ?? "profissional"}
          </h1>
          <p className="text-sm text-muted-foreground">Seu painel de chamados e ganhos.</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-soft">
          <Radio className={profile?.is_online ? "size-4 text-brand" : "size-4 text-muted-foreground"} />
          <span className="text-xs font-semibold">{profile?.is_online ? "Online" : "Offline"}</span>
          <Switch checked={!!profile?.is_online} onCheckedChange={(v) => void toggleOnline(v)} />
        </label>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Serviços ativos" value={String(active.length)} />
        <Stat label="Concluídos" value={String(profile?.jobs_done ?? done.length)} />
        <Stat label="Avaliação" value={(profile?.rating_avg ?? 0).toFixed(1)} icon={<Star className="size-3.5" />} />
        <Stat label="Ganhos" value={brl(earnings)} icon={<TrendingUp className="size-3.5" />} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Chamados disponíveis</h2>
        <p className="text-sm text-muted-foreground">
          Pedidos abertos publicados por clientes na plataforma.
        </p>
        <div className="mt-4 space-y-3">
          {open.length === 0 && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum chamado aberto no momento. Fique online para não perder oportunidades.
            </p>
          )}
          {open.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{r.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {categories.find((c) => c.id === r.category_id)?.name ?? "Serviço"} ·{" "}
                    {r.address ?? "Endereço combinado no chat"}
                  </p>
                </div>
                <Button size="sm" variant="brand" onClick={() => void accept(r)}>
                  Aceitar
                </Button>
              </div>
              {r.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Meus serviços</h2>
        <div className="mt-4 space-y-3">
          {isLoading && <Skeleton className="h-32 rounded-2xl" />}
          {!isLoading && jobs.length === 0 && (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Você ainda não tem serviços atribuídos.
            </p>
          )}
          {jobs.map((r) => {
            const step = NEXT_STATUS[r.status];
            return (
              <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <h3 className="min-w-0 truncate font-semibold">{r.title}</h3>
                  <Badge variant={r.status === "cancelled" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                {r.status !== "cancelled" && (
                  <div className="mt-3">
                    <StatusTimeline status={r.status} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="soft" onClick={() => setChat(r)}>
                    <MessageSquare /> Chat
                  </Button>
                  {step && (
                    <Button size="sm" variant="brand" onClick={() => void advance(r, step.next)}>
                      {step.label}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ChatDialog
        requestId={chat?.id ?? null}
        title={chat?.title ?? ""}
        open={!!chat}
        onOpenChange={(v) => !v && setChat(null)}
      />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 truncate text-xl font-extrabold">{value}</p>
    </div>
  );
}
