/** Utilidades para encaminhar contatos/orçamentos ao WhatsApp do prestador. */

const DEFAULT_DDI = "55";

/** Normaliza um telefone brasileiro para o formato aceito pelo wa.me. */
export function waNumber(phone?: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith(DEFAULT_DDI) && digits.length >= 12) return digits;
  return `${DEFAULT_DDI}${digits}`;
}

/** Monta o link do WhatsApp; retorna null quando não há telefone válido. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const number = waNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Mensagem padrão de pedido de orçamento. */
export function hireMessage(providerName: string, categoryName?: string | null): string {
  const service = categoryName ? ` de ${categoryName}` : "";
  return `Olá, ${providerName.split(" ")[0]}! Vi seu perfil no ServiçoJá e gostaria de um orçamento${service}.`;
}
