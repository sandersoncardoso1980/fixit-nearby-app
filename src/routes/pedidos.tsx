import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Star, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusTimeline } from "@/components/StatusTimeline";
import { StarRating } from "@/components/StarRating";
import { ChatDialog } from "@/components/ChatDialog";
import { useAuth } from "@/lib/auth";
import { myRequestsQuery, categoriesQuery, providersQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/geo";
import { STATUS_LABEL, type ServiceRequest } from "@/lib/types";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — ServiçoJá" },
      {
        name: "description",
        content: "Acompanhe o andamento dos seus serviços contratados, converse com o prestador e avalie.",
      },
      { property: "og:title", content: "Meus pedidos — ServiçoJá" },
      { property: "og:description", content: "Acompanhe seus serviços contratados em tempo real." },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const { profile, loading } = useAuth();
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery(myRequestsQuery(profile?.id));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: providers = [] } = useQuery(providersQuery);

  const [chat, setChat] = useState<ServiceRequest | null>(null);
  const [review, setReview] = useState<ServiceRequest | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function cancel(r: ServiceRequest) {
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled" })
      .eq("id", r.id);
    if (error) {
      toast.error("Não foi possível cancelar.");
      return;
    }
    toast.success("Pedido cancelado.");
    void qc.invalidateQueries({ queryKey: ["my-requests"] });
  }

  async function submitReview() {
    if (!review || !profile || !review.provider_id) return;
    const { error } = await supabase.from("reviews").insert({
      request_id: review.id,
      reviewer_id: profile.id,
      reviewee_id: review.provider_id,
      rating,
      comment: comment.trim().slice(0, 500) || null,
    });
    if (error) {
      toast.error("Não foi possível enviar a avaliação.");
      return;
    }
    toast.success("Avaliação enviada. Obrigado!");
    setReview(null);
    setComment("");
    setRating(5);
  }

  if (!loading && !profile) {
    return (
      <EmptyState
        title="Entre para ver seus pedidos"
        description="Você precisa de uma conta para acompanhar seus serviços."
        action={
          <Button variant="brand" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">Meus pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe cada etapa, converse com o profissional e avalie ao final.
      </p>

      <div className="mt-6 space-y-4">
        {(isLoading || loading) &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}

        {!isLoading && !loading && requests.length === 0 && (
          <EmptyState
            title="Nenhum pedido ainda"
            description="Encontre um profissional e solicite seu primeiro orçamento."
            action={
              <Button variant="brand" asChild>
                <Link to="/">Buscar profissionais</Link>
              </Button>
            }
          />
        )}

        {requests.map((r) => {
          const provider = providers.find((p) => p.id === r.provider_id);
          const category = categories.find((c) => c.id === r.category_id);
          return (
            <article key={r.id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold">{r.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {category?.name ?? "Serviço"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    {provider ? ` · ${provider.full_name}` : " · aguardando prestador"}
                  </p>
                </div>
                <Badge variant={r.status === "cancelled" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </div>

              {r.description && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              )}

              {r.status !== "cancelled" && (
                <div className="mt-4">
                  <StatusTimeline status={r.status} />
                </div>
              )}

              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {r.agreed_price ? brl(r.agreed_price) : "Orçamento em aberto"}
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.provider_id && (
                    <Button size="sm" variant="soft" onClick={() => setChat(r)}>
                      <MessageSquare /> Chat
                    </Button>
                  )}
                  {r.status === "completed" && r.provider_id && (
                    <Button size="sm" variant="brand" onClick={() => setReview(r)}>
                      <Star /> Avaliar
                    </Button>
                  )}
                  {(r.status === "pending" || r.status === "accepted") && (
                    <Button size="sm" variant="ghost" onClick={() => void cancel(r)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ChatDialog
        requestId={chat?.id ?? null}
        title={chat?.title ?? ""}
        open={!!chat}
        onOpenChange={(v) => !v && setChat(null)}
      />

      <Dialog open={!!review} onOpenChange={(v) => !v && setReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar serviço</DialogTitle>
          </DialogHeader>
          <StarRating value={rating} size={28} onChange={setRating} />
          <Textarea
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte como foi a experiência (opcional)"
          />
          <DialogFooter>
            <Button variant="brand" onClick={() => void submitReview()}>
              Enviar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
        <PackageOpen className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
