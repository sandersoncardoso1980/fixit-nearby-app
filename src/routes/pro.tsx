import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy, Crown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRO_BENEFITS, PRO_PAYMENT, PRO_PRICE_LABEL } from "@/lib/pro";
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
        content: "Destaque na tela inicial, selo verificado e prioridade nas buscas por R$ 49,90/mês.",
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

  const pending = myRequests.some((r) => r.status === "pending");


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
          <li>2. Avise a administração pelo WhatsApp com seu nome e profissão.</li>
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
        <p className="mt-2 text-sm text-muted-foreground">
          Não é preciso criar conta. Faça o Pix e fale com a administração pelo WhatsApp informando
          seu nome e profissão — seu perfil é destacado em seguida.
        </p>
        <Button asChild variant="brand" className="mt-4 w-full sm:w-auto">
          <a
            href={`https://wa.me/${PRO_PAYMENT.whatsapp}?text=${encodeURIComponent(
              "Olá! Quero ativar o Plano PRO do ServiçoJá. Meu nome é ___ e minha profissão é ___.",
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle /> Ativar PRO pelo WhatsApp
          </a>
        </Button>
      </section>
    </div>
  );
}

