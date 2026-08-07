ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS profile_views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.pro_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_phone text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_requests TO authenticated;
GRANT ALL ON public.pro_requests TO service_role;

ALTER TABLE public.pro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers create own pro requests" ON public.pro_requests
  FOR INSERT TO authenticated WITH CHECK (provider_id = public.current_profile_id());
CREATE POLICY "providers read own pro requests" ON public.pro_requests
  FOR SELECT TO authenticated USING (provider_id = public.current_profile_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update pro requests" ON public.pro_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete pro requests" ON public.pro_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_pro_requests_updated_at ON public.pro_requests;
CREATE TRIGGER update_pro_requests_updated_at BEFORE UPDATE ON public.pro_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.register_profile_view(_provider_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET profile_views = profile_views + 1 WHERE id = _provider_id AND role = 'provider';
$$;

CREATE OR REPLACE FUNCTION public.register_contact(_provider_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET contact_count = contact_count + 1 WHERE id = _provider_id AND role = 'provider';
$$;

REVOKE ALL ON FUNCTION public.register_profile_view(uuid) FROM public;
REVOKE ALL ON FUNCTION public.register_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.register_profile_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_contact(uuid) TO anon, authenticated;