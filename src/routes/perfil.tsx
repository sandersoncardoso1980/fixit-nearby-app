import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CITY_NAME } from "@/lib/geo";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — ServiçoJá" },
      { name: "description", content: "Atualize seus dados, valor por hora e área de cobertura." },
      { property: "og:title", content: "Meu perfil — ServiçoJá" },
      { property: "og:description", content: "Atualize seus dados e preferências na ServiçoJá." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { profile, loading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setPhone(profile.phone ?? "");
    setCity(profile.city ?? CITY_NAME);
    setBio(profile.bio ?? "");
    setRate(profile.hourly_rate ? String(profile.hourly_rate) : "");
  }, [profile]);

  if (!loading && !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-lg font-bold">Entre para editar seu perfil</h1>
        <Button variant="brand" className="mt-5" asChild>
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  async function save() {
    if (!profile) return;
    if (!fullName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim().slice(0, 80),
        phone: phone.trim().slice(0, 20) || null,
        city: city.trim().slice(0, 80) || null,
        bio: bio.trim().slice(0, 400) || null,
        hourly_rate: rate ? Number(rate) : null,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado!");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-extrabold">Meu perfil</h1>
      <div className="mt-6 space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        {profile?.role === "provider" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Valor por hora (R$)</Label>
              <Input
                id="rate"
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Sobre o seu trabalho</Label>
              <Textarea
                id="bio"
                maxLength={400}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Experiência, especialidades e diferenciais"
              />
            </div>
          </>
        )}
        <Button variant="brand" className="w-full" onClick={() => void save()} disabled={busy}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
