/** O ServiçoJá atende exclusivamente Entre Rios de Minas (MG). */
export const CITY_NAME = "Entre Rios de Minas";
export const CITY_STATE = "MG";
export const CITY_LABEL = `${CITY_NAME}, ${CITY_STATE}`;

export function brl(value: number | null | undefined): string {
  if (value == null) return "a combinar";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
