import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso do administrador — ServiçoJá" },
      {
        name: "description",
        content: "Área restrita de administração do ServiçoJá em Entre Rios de Minas.",
      },
      { property: "og:title", content: "Acesso do administrador — ServiçoJá" },
      { property: "og:description", content: "Área restrita de administração do ServiçoJá." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { userId, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && userId && isAdmin) void navigate({ to: "/admin", replace: true });
  }, [loading, userId, isAdmin, navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    toast.success("Bem-vindo de volta!");
    void navigate({ to: "/admin" });
  }

  return (
    <div className="mx-auto grid max-w-md px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-hero text-white">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="text-2xl font-extrabold">Acesso do administrador</h1>
        <p className="text-sm text-muted-foreground">
          Área restrita. Clientes e profissionais não precisam de conta — o contato é direto pelo
          WhatsApp.
        </p>
      </div>

      <Card className="shadow-lift">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Use as credenciais de administrador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="in-email">E-mail</Label>
            <Input
              id="in-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="in-pass">Senha</Label>
            <Input
              id="in-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void signIn();
              }}
            />
          </div>
          <Button className="w-full" variant="brand" onClick={() => void signIn()} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
