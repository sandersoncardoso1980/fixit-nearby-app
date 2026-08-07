export const PRO_PRICE = 19.9;
export const PRO_PRICE_LABEL = "R$ 19,90/mês";

/** Dados de pagamento do plano PRO (pagamento direto ao administrador). */
export const PRO_PAYMENT = {
  pixKey: "servicoja@exemplo.com",
  pixName: "ServiçoJá",
  whatsapp: "5531999999999",
};

export const PRO_BENEFITS = [
  "Perfil destacado na tela inicial",
  "Mais fotos no portfólio",
  "Portfólio completo de trabalhos",
  "Mais informações no perfil",
  "Selo de profissional verificado",
  "Estatísticas de visualizações",
  "Quantidade de contatos recebidos",
  "Destaque nas buscas",
  "Prioridade em determinadas pesquisas",
];

export function isProActive(p: {
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
}): boolean {
  if (!p?.is_pro) return false;
  if (!p.pro_expires_at) return true;
  return new Date(p.pro_expires_at).getTime() > Date.now();
}
