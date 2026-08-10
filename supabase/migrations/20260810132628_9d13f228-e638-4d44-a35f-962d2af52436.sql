CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  link_url text,
  phone text,
  amount_paid numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active ads are public" ON public.ads
FOR SELECT TO anon, authenticated
USING (is_active AND starts_at <= now() AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "admins read all ads" ON public.ads
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert ads" ON public.ads
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update ads" ON public.ads
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete ads" ON public.ads
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "admins insert categories" ON public.categories
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update categories" ON public.categories
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete categories" ON public.categories
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories (slug);