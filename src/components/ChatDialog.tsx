import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChatDialog({
  requestId,
  title,
  open,
  onOpenChange,
}: {
  requestId: string | null;
  title: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !requestId) return;
    let active = true;

    void supabase
      .from("chat_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at")
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as ChatMessage[]);
      });

    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as ChatMessage).id)
              ? prev
              : [...prev, payload.new as ChatMessage],
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [open, requestId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const content = text.trim().slice(0, 500);
    if (!content || !requestId || !profile) return;
    setText("");
    await supabase
      .from("chat_messages")
      .insert({ request_id: requestId, sender_id: profile.id, content });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[75vh] max-h-[640px] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>Conversa em tempo real sobre este atendimento.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Diga um olá!
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === profile?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-card",
                  )}
                >
                  {m.content}
                </p>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma mensagem…"
          />
          <Button type="submit" size="icon" variant="brand" aria-label="Enviar">
            <Send />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
