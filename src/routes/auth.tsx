import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Hammer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — ServiçoJá" },
      {
        name: "description",
        content: "Acesse sua conta ServiçoJá como cliente ou prestador de serviços.",
      },
      { property: "og:title", content: "Entrar ou criar conta — ServiçoJá" },
      { property: "og:description", content: "Acesse sua conta ServiçoJá como cliente ou prestador." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { userId, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"client" | "provider">("client");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && userId) void navigate({ to: "/", replace: true });
  }, [loading, userId, navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo de volta!");
    void navigate({ to: "/" });
  }

  async function signUp() {
    if (password.length < 6) { toast.error("A senha precisa ter ao menos 6 caracteres."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim().slice(0, 80), role },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) {
      toast.success("Conta criada! Confirme seu e-mail para entrar.");
      return;
    }
    toast.success("Conta criada com sucesso!");
    void navigate({ to: role === "provider" ? "/prestador" : "/" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) { toast.error("Não foi possível entrar com o Google."); return; }
    if (result.redirected) return;
    void navigate({ to: "/" });
  }

  return (
    <div className="mx-auto grid max-w-md px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-hero text-white">
          <Hammer className="size-5" />
        </span>
        <h1 className="text-2xl font-extrabold">
          Serviço<span className="text-brand">Já</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Contrate ou ofereça serviços na sua região.
        </p>
      </div>

      <Card className="shadow-lift">
        <Tabs defaultValue="signin">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={google}>
              Continuar com Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>

            <TabsContent value="signin" className="space-y-4">
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
                />
              </div>
              <Button className="w-full" variant="brand" onClick={signIn} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Entrar
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <CardDescription>Eu quero…</CardDescription>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "client", label: "Contratar serviços" },
                    { key: "provider", label: "Oferecer serviços" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setRole(o.key)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3 text-left text-sm font-medium transition-colors",
                      role === o.key ? "border-primary bg-accent" : "hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-name">Nome completo</Label>
                <Input
                  id="up-name"
                  value={fullName}
                  maxLength={80}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-email">E-mail</Label>
                <Input
                  id="up-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-pass">Senha</Label>
                <Input
                  id="up-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" variant="brand" onClick={signUp} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Criar conta
              </Button>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <CardTitle className="sr-only">Autenticação</CardTitle>
    </div>
  );
}
