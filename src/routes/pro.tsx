import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Check, Copy, Crown, Eye, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { myProRequestsQuery } from "@/lib/queries";
import { PRO_BENEFITS, PRO_PAYMENT, PRO_PRICE_LABEL, isProActive } from "@/lib/pro";
import { CITY_NAME } from "@/lib/geo";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Plano PRO — destaque seu perfil | ServiçoJá" },
      {
        name: "description",
        content:
          "Por R$ 49,90/mês tenha perfil destacado, selo de verificado, portfólio ampliado, estatísticas e prioridade nas buscas do ServiçoJá.",
      },
      { property: "og:title", content: "Plano PRO — destaque seu perfil | ServiçoJá" },
      {
        property: "og:description",
        content: "Destaque na tela inicial, selo verificado e prioridade nas buscas por R$ 19,90/mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: myRequests = [] } = useQuery(myProRequestsQuery(profile?.id));
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const active = profile ? isProActive(profile) : false;
  const pending = myRequests.some((r) => r.status === "pending");

  async function submit() {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("pro_requests").insert({
      provider_id: profile.id,
      contact_phone: phone.trim().slice(0, 20) || profile.phone,
      message: message.trim().slice(0, 400) || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar sua solicitação.");
      return;
    }
    setMessage("");
    void qc.invalidateQueries({ queryKey: ["my-pro-requests"] });
    toast.success("Solicitação enviada! Faça o Pix e o administrador ativará seu PRO.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl bg-gradient-hero p-6 text-white shadow-lift">
        <Badge className="border-0 bg-white/15 text-white hover:bg-white/15">
          <Crown className="mr-1 size-3" /> Plano PRO
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold">Apareça primeiro em {CITY_NAME}</h1>
        <p className="mt-2 text-sm text-white/85">
          Banner de destaque na tela inicial, selo de verificado e prioridade nas buscas.
        </p>
        <p className="mt-4 text-4xl font-extrabold">{PRO_PRICE_LABEL}</p>
        <p className="text-xs text-white/75">Sem assinatura automática — pagamento mensal por Pix.</p>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        {PRO_BENEFITS.map((b) => (
          <p key={b} className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm shadow-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-success" /> {b}
          </p>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">Como funciona</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>1. Faça o Pix de {PRO_PRICE_LABEL} para a chave abaixo.</li>
          <li>2. Envie sua solicitação de ativação nesta página.</li>
          <li>3. O administrador confirma o pagamento e ativa seu selo PRO por 30 dias.</li>
        </ol>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 rounded-xl border bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Chave Pix ({PRO_PAYMENT.pixName})
            </p>
            <p className="truncate font-mono text-sm">{PRO_PAYMENT.pixKey}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(PRO_PAYMENT.pixKey);
                toast.success("Chave Pix copiada.");
              }}
            >
              <Copy /> Copiar
            </Button>
            <Button asChild variant="soft">
              <a
                href={`https://wa.me/${PRO_PAYMENT.whatsapp}?text=${encodeURIComponent(
                  "Olá! Fiz o Pix do Plano PRO do ServiçoJá.",
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> Enviar comprovante
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">Ativar meu PRO</h2>

        {!profile && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Entre com sua conta de profissional para solicitar a ativação.
            </p>
            <Button asChild variant="brand" className="mt-3">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        )}

        {profile && profile.role !== "provider" && (
          <p className="mt-3 text-sm text-muted-foreground">
            O plano PRO é exclusivo para contas de profissional.
          </p>
        )}

        {profile?.role === "provider" && active && (
          <div className="mt-3 rounded-xl border border-brand/40 bg-accent p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="size-4 text-brand" /> Seu plano PRO está ativo
            </p>
            {profile.pro_expires_at && (
              <p className="mt-1 text-muted-foreground">
                Válido até {new Date(profile.pro_expires_at).toLocaleDateString("pt-BR")}.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat icon={<Eye className="size-3.5" />} label="Visualizações" value={profile.profile_views} />
              <Stat icon={<Phone className="size-3.5" />} label="Contatos" value={profile.contact_count} />
            </div>
          </div>
        )}

        {profile?.role === "provider" && !active && (
          <div className="mt-3 space-y-3">
            {pending ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Sua solicitação foi enviada e está aguardando a confirmação do pagamento.
              </p>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="pro-phone">Telefone para contato</Label>
                  <Input
                    id="pro-phone"
                    maxLength={20}
                    value={phone}
                    placeholder={profile.phone ?? "(31) 90000-0000"}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pro-msg">Mensagem (opcional)</Label>
                  <Textarea
                    id="pro-msg"
                    rows={3}
                    maxLength={400}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ex.: Pix feito às 10h no valor de R$ 19,90."
                  />
                </div>
                <Button variant="brand" className="w-full" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Enviando…" : "Solicitar ativação do PRO"}
                </Button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-xl font-extrabold">{value}</p>
    </div>
  );
}
