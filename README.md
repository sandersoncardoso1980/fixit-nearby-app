# Serviço Certo

Crie um aplicativo web completo, moderno e responsivo (Mobile-First) no estilo "Uber de Serviços Domésticos e Profissionais" chamado ServiçoJá. O sistema conecta clientes a prestadores de serviços locais (eletricistas, encanadores, pintores, chaveiros, limpezas, etc.) com busca por proximidade, comparador de preços e avaliações.

---

### 1. Arquitetura e Bibliotecas

- Frontend: React, Vite, Tailwind CSS, componentes do Shadcn UI e ícones Lucide React.

- Mapas: Leaflet (react-leaflet) ou Mapbox com marcadores interativos de prestadores e clientes.

- Backend/Persistência (Supabase):

  - Autenticação com e-mail e roles de usuário ('client', 'provider', 'admin').

  - Banco de dados PostgreSQL relacional com políticas de segurança RLS (Row Level Security).

  - Supabase Realtime para mensagens do chat e atualização de status de solicitações.

---

### 2. Esquema do Banco de Dados (Supabase Schemas)

1. `profiles`:

   - id (uuid, references auth.users)

   - role ('client' | 'provider' | 'admin')

   - full_name (text), avatar_url (text), phone (text), bio (text)

   - latitude (float), longitude (float), city (text)

   - rating_avg (numeric), total_reviews (integer)

   - hourly_rate (numeric, apenas prestadores)

   - is_online (boolean, apenas prestadores)

   - coverage_radius_km (integer, default 15)

2. `categories`:

   - id (uuid), name (text), icon_name (text), description (text), base_estimated_price (numeric)

3. `provider_categories` (N:M):

   - provider_id (uuid), category_id (uuid)

4. `service_requests`:

   - id (uuid), client_id (uuid), provider_id (uuid, nullable), category_id (uuid)

   - title (text), description (text), address (text), lat (float), lng (float)

   - status ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')

   - agreed_price (numeric), scheduled_at (timestamp)

5. `reviews`:

   - id (uuid), request_id (uuid), reviewer_id (uuid), reviewee_id (uuid)

   - rating (integer 1-5), comment (text), created_at (timestamp)

6. `chat_messages`:

   - id (uuid), request_id (uuid), sender_id (uuid), content (text), created_at (timestamp)

---

### 3. Módulos e Fluxos de Interface (UI/UX)

#### A. Visão do Cliente (`role: client`)

- Dashboard Principal:

  - Hero com campo de busca ("Qual serviço você precisa?") e seletor de localização/CEP.

  - Carrossel/Grid de categorias com ícones (Eletricista, Encanador, Ar-condicionado, Pintor, etc.).

  - Mapa Interativo de Proximidade: exibe marcadores dos prestadores online em um raio selecionável (5km, 10km, 20km).

  - Filtros Dinâmicos: "Melhor Avaliado", "Menor Preço/Hora", "Mais Próximo", "Disponível Agora".

- Perfil do Prestador & Modal de Contratação:

  - Card contendo foto, nota (ex: 4.9 ★), quantidade de trabalhos realizados, distância em km, preço médio/hora, galeria de fotos de serviços anteriores e botão "Solicitar Orçamento".

- Painel de Acompanhamento:

  - Timeline visual do pedido: "Solicitado" -> "Prestador Aceitou" -> "A Caminho" -> "Em Execução" -> "Concluído".

  - Sistema de avaliação pós-serviço (1 a 5 estrelas + comentário).

#### B. Visão do Prestador (`role: provider`)

- Toggle de Disponibilidade: Botão fixo no topo "Ficar Online / Offline".

- Radar de Chamados Próximos:

  - Lista de solicitações pendentes na área de cobertura com distância, valor estimado e descrição do problema.

  - Ações rápidas: "Aceitar Chamado" ou "Enviar Contraproposta de Valor".

- Gestão de Atendimentos:

  - Abas: "Novos Chamados", "Em Andamento", "Histórico" e "Extrato de Ganhos".

- Configuração de Perfil Profissional:

  - Seleção de categorias de atuação, definição da taxa por hora, raio de atendimento e fotos do portfólio.

---

### 4. Recursos Especiais na Interface

1. Chat em Tempo Real: Modal de conversa direto entre cliente e prestador no contexto do pedido ativo.

2. Comparador Lado a Lado: Recurso para selecionar até 3 prestadores e comparar valores, distância e nota em uma tabela.

3. Calculadora Estimativa de Preço: Ferramenta interativa onde o cliente seleciona a complexidade da tarefa e visualiza uma média praticada na região.

4. Design System:

  - Estilo limpo e moderno (Cores primárias: Azul Indigo/Slate para confiança e Laranja/Amarelo para ações principais).

  - Suporte nativo a Light Mode e Dark Mode.

  - Popule o app com dados iniciais fictícios (Mock/Seed): pelo menos 8 prestadores com fotos reais do Unsplash, 6 categorias e 4 solicitações de teste para permitir navegação imediata.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fixit-nearby-app.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6822f7c-5638-48cc-98cd-90d9c86b6307).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
