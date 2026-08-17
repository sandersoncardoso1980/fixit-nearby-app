import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { waLink, hireMessage } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";

export function WhatsAppButton({
  provider,
  categoryName,
  label = "WhatsApp",
  size = "sm",
  className,
  variant = "brand",
}: {
  provider: Pick<Profile, "id" | "full_name" | "phone">;
  categoryName?: string | null;
  label?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  variant?: "brand" | "outline" | "soft" | "secondary";
}) {
  const href = waLink(provider.phone, hireMessage(provider.full_name, categoryName));

  if (!href) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        onClick={() => toast.info("Este profissional ainda não cadastrou um WhatsApp.")}
      >
        <MessageCircle className="size-4" /> {label}
      </Button>
    );
  }

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          void supabase.rpc("register_contact", { _provider_id: provider.id });
        }}
      >
        <MessageCircle className="size-4" /> {label}
      </a>
    </Button>
  );
}
