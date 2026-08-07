import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Category, Profile } from "@/lib/types";

export function RequestDialog({
  provider,
  categories,
  defaultCategoryId,
  open,
  onOpenChange,
}: {
  provider: Profile | null;
  categories: Category[];
  defaultCategoryId?: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!profile) {
      onOpenChange(false);
      void navigate({ to: "/auth" });
      return;
    }
    if (title.trim().length < 4) {
      toast.error("Descreva o serviço em pelo menos 4 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("service_requests").insert({
      client_id: profile.id,
      provider_id: provider?.id ?? null,
      category_id: categoryId || null,
      title: title.trim().slice(0, 120),
      description: description.trim().slice(0, 1000) || null,
      address: address.trim().slice(0, 200) || null,
      status: provider ? "pending" : "pending",
      agreed_price: price ? Number(price) : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Solicitação enviada!");
    void qc.invalidateQueries({ queryKey: ["my-requests"] });
    onOpenChange(false);
    setTitle("");
    setDescription("");
    void navigate({ to: "/pedidos" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {provider ? `Solicitar orçamento — ${provider.full_name}` : "Nova solicitação"}
          </DialogTitle>
          <DialogDescription>
            Conte o que você precisa. O prestador responde com o valor e a disponibilidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-title">O que você precisa?</Label>
            <Input
              id="req-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Trocar chuveiro elétrico"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-desc">Detalhes</Label>
            <Textarea
              id="req-desc"
              value={description}
              maxLength={1000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema, tamanho do ambiente, urgência…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-addr">Endereço</Label>
              <Input
                id="req-addr"
                value={address}
                maxLength={200}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número e bairro"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-price">Orçamento previsto (R$)</Label>
              <Input
                id="req-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Enviando…" : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
