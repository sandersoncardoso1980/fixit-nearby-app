
CREATE TYPE public.app_role AS ENUM ('client','provider','admin');
CREATE TYPE public.request_status AS ENUM ('pending','accepted','in_progress','completed','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'client',
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  bio text,
  latitude double precision,
  longitude double precision,
  city text,
  rating_avg numeric NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  jobs_done integer NOT NULL DEFAULT 0,
  hourly_rate numeric,
  is_online boolean NOT NULL DEFAULT false,
  coverage_radius_km integer NOT NULL DEFAULT 15,
  portfolio text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text NOT NULL DEFAULT 'Wrench',
  description text,
  base_estimated_price numeric NOT NULL DEFAULT 100
);

CREATE TABLE public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, category_id)
);

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  address text,
  lat double precision,
  lng double precision,
  status public.request_status NOT NULL DEFAULT 'pending',
  agreed_price numeric,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.provider_categories TO anon;
GRANT SELECT, INSERT, DELETE ON public.provider_categories TO authenticated;
GRANT ALL ON public.provider_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories readable" ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "provider_categories readable" ON public.provider_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "manage own provider categories" ON public.provider_categories FOR INSERT TO authenticated WITH CHECK (provider_id = public.current_profile_id());
CREATE POLICY "delete own provider categories" ON public.provider_categories FOR DELETE TO authenticated USING (provider_id = public.current_profile_id());

CREATE POLICY "requests visible to participants or open providers" ON public.service_requests
  FOR SELECT TO authenticated
  USING (client_id = public.current_profile_id() OR provider_id = public.current_profile_id() OR (status = 'pending' AND provider_id IS NULL));
CREATE POLICY "clients create requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (client_id = public.current_profile_id());
CREATE POLICY "participants update requests" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (client_id = public.current_profile_id() OR provider_id = public.current_profile_id() OR (status = 'pending' AND provider_id IS NULL))
  WITH CHECK (client_id = public.current_profile_id() OR provider_id = public.current_profile_id());

CREATE POLICY "reviews readable" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = public.current_profile_id());

CREATE POLICY "chat visible to participants" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND (r.client_id = public.current_profile_id() OR r.provider_id = public.current_profile_id())));
CREATE POLICY "chat insert by participants" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = public.current_profile_id() AND EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND (r.client_id = public.current_profile_id() OR r.provider_id = public.current_profile_id())));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name, city)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    'São Paulo'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;

INSERT INTO public.categories (id, name, slug, icon_name, description, base_estimated_price) VALUES
 ('11111111-1111-4111-8111-000000000001','Eletricista','eletricista','Zap','Instalações, tomadas, quadros e curtos-circuitos',180),
 ('11111111-1111-4111-8111-000000000002','Encanador','encanador','Droplets','Vazamentos, desentupimento e hidráulica em geral',160),
 ('11111111-1111-4111-8111-000000000003','Pintor','pintor','PaintRoller','Pintura residencial, texturas e reparos',140),
 ('11111111-1111-4111-8111-000000000004','Chaveiro','chaveiro','KeyRound','Abertura de portas, troca de fechaduras e cópias',120),
 ('11111111-1111-4111-8111-000000000005','Limpeza','limpeza','Sparkles','Faxina, pós-obra e limpeza pesada',110),
 ('11111111-1111-4111-8111-000000000006','Ar-condicionado','ar-condicionado','Wind','Instalação, higienização e manutenção de split',220);

INSERT INTO public.profiles (id, role, full_name, avatar_url, phone, bio, latitude, longitude, city, rating_avg, total_reviews, jobs_done, hourly_rate, is_online, coverage_radius_km, portfolio) VALUES
 ('22222222-2222-4222-8222-000000000001','provider','Carlos Mendes','https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80','(11) 98811-1001','Eletricista há 14 anos, especialista em quadros de distribuição e automação residencial.',-23.5610,-46.6560,'São Paulo',4.9,132,410,95,true,20,ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000002','provider','Ana Beatriz Rocha','https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80','(11) 98811-1002','Encanadora certificada. Diagnóstico de vazamentos sem quebra-quebra.',-23.5750,-46.6420,'São Paulo',4.8,98,265,88,true,15,ARRAY['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80','https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000003','provider','Rafael Lima','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80','(11) 98811-1003','Pintor profissional. Acabamento fino, massa corrida e texturas decorativas.',-23.5480,-46.6350,'São Paulo',4.7,76,190,70,true,25,ARRAY['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80','https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000004','provider','Juliana Prado','https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80','(11) 98811-1004','Serviços de limpeza pesada e pós-obra com equipe própria.',-23.5905,-46.6820,'São Paulo',4.95,211,520,60,true,12,ARRAY['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80','https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000005','provider','Marcos Antunes','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80','(11) 98811-1005','Chaveiro 24h. Abertura sem danos e troca de segredo na hora.',-23.5320,-46.6600,'São Paulo',4.6,54,320,80,false,30,ARRAY['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000006','provider','Patrícia Nunes','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80','(11) 98811-1006','Técnica em refrigeração. Instalação e higienização de split.',-23.6020,-46.6650,'São Paulo',4.85,143,298,120,true,18,ARRAY['https://images.unsplash.com/photo-1631545806609-4b6d0e0b7f30?w=800&q=80','https://images.unsplash.com/photo-1585129777188-9930c1f4de51?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000007','provider','Eduardo Salles','https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80','(11) 98811-1007','Elétrica predial e manutenção preventiva para condomínios.',-23.5550,-46.7100,'São Paulo',4.4,39,150,75,false,22,ARRAY['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80']),
 ('22222222-2222-4222-8222-000000000008','provider','Sandra Oliveira','https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80','(11) 98811-1008','Pintura e pequenos reparos. Orçamento no mesmo dia.',-23.5210,-46.6900,'São Paulo',4.75,87,205,65,true,16,ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80','https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80']);

INSERT INTO public.profiles (id, role, full_name, avatar_url, city, latitude, longitude) VALUES
 ('33333333-3333-4333-8333-000000000001','client','Bruno Carvalho','https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80','São Paulo',-23.5600,-46.6500),
 ('33333333-3333-4333-8333-000000000002','client','Marina Costa','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80','São Paulo',-23.5700,-46.6600);

INSERT INTO public.provider_categories (provider_id, category_id) VALUES
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001'),
 ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000001'),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002'),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000003'),
 ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000003'),
 ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000004'),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000005'),
 ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000006'),
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000006');

INSERT INTO public.service_requests (id, client_id, provider_id, category_id, title, description, address, lat, lng, status, agreed_price, scheduled_at) VALUES
 ('44444444-4444-4444-8444-000000000001','33333333-3333-4333-8333-000000000001',NULL,'11111111-1111-4111-8111-000000000001','Tomada queimada na cozinha','A tomada da cozinha parou de funcionar depois de uma queda de energia.','Rua Augusta, 1200 - Consolação',-23.5560,-46.6600,'pending',NULL,now() + interval '1 day'),
 ('44444444-4444-4444-8444-000000000002','33333333-3333-4333-8333-000000000002','22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000002','Vazamento embaixo da pia','Está pingando água constantemente no armário do banheiro.','Av. Paulista, 900 - Bela Vista',-23.5700,-46.6480,'accepted',260,now() + interval '2 days'),
 ('44444444-4444-4444-8444-000000000003','33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000006','Higienização de dois splits','Ar-condicionado com cheiro forte, precisa de limpeza completa.','Rua Vergueiro, 500 - Liberdade',-23.5730,-46.6390,'in_progress',380,now()),
 ('44444444-4444-4444-8444-000000000004','33333333-3333-4333-8333-000000000002','22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000005','Faxina pós-obra apartamento 70m²','Apartamento recém reformado, muito pó e respingo de tinta.','Rua dos Pinheiros, 300 - Pinheiros',-23.5640,-46.6930,'completed',540,now() - interval '3 days');

INSERT INTO public.reviews (request_id, reviewer_id, reviewee_id, rating, comment) VALUES
 ('44444444-4444-4444-8444-000000000004','33333333-3333-4333-8333-000000000002','22222222-2222-4222-8222-000000000004',5,'Ficou impecável! Equipe pontual e caprichosa.'),
 (NULL,'33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000001',5,'Resolveu o problema em menos de uma hora. Recomendo.'),
 (NULL,'33333333-3333-4333-8333-000000000001','22222222-2222-4222-8222-000000000003',4,'Bom acabamento, só atrasou um pouco para chegar.');

INSERT INTO public.chat_messages (request_id, sender_id, content) VALUES
 ('44444444-4444-4444-8444-000000000002','33333333-3333-4333-8333-000000000002','Oi Ana, consegue vir amanhã de manhã?'),
 ('44444444-4444-4444-8444-000000000002','22222222-2222-4222-8222-000000000002','Consigo sim! Chego por volta das 9h.');
