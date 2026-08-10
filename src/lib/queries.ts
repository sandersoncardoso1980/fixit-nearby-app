import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Ad, Category, Profile, ProRequest, Review, ServiceRequest } from "@/lib/types";

export const activeAdsQuery = queryOptions({
  queryKey: ["ads", "active"],
  queryFn: async (): Promise<Ad[]> => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Ad[];
  },
});

export const allAdsQuery = queryOptions({
  queryKey: ["ads", "all"],
  queryFn: async (): Promise<Ad[]> => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Ad[];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const providersQuery = queryOptions({
  queryKey: ["providers"],
  queryFn: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "provider")
      .order("rating_avg", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  },
});

export const providerCategoriesQuery = queryOptions({
  queryKey: ["provider-categories"],
  queryFn: async (): Promise<{ provider_id: string; category_id: string }[]> => {
    const { data, error } = await supabase.from("provider_categories").select("*");
    if (error) throw error;
    return data ?? [];
  },
});

export function providerQuery(id: string) {
  return queryOptions({
    queryKey: ["provider", id],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}

export function reviewsQuery(profileId: string) {
  return queryOptions({
    queryKey: ["reviews", profileId],
    queryFn: async (): Promise<(Review & { reviewer: { full_name: string; avatar_url: string | null } | null })[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)")
        .eq("reviewee_id", profileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}

export function myRequestsQuery(profileId: string | undefined) {
  return queryOptions({
    queryKey: ["my-requests", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<ServiceRequest[]> => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("client_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

export function providerJobsQuery(profileId: string | undefined) {
  return queryOptions({
    queryKey: ["provider-jobs", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<ServiceRequest[]> => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("provider_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

export const openRequestsQuery = queryOptions({
  queryKey: ["open-requests"],
  queryFn: async (): Promise<ServiceRequest[]> => {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("status", "pending")
      .is("provider_id", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ServiceRequest[];
  },
});

export const proProvidersQuery = queryOptions({
  queryKey: ["pro-providers"],
  queryFn: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "provider")
      .eq("is_pro", true)
      .order("rating_avg", { ascending: false });
    if (error) throw error;
    const now = Date.now();
    return ((data ?? []) as Profile[]).filter(
      (p) => !p.pro_expires_at || new Date(p.pro_expires_at).getTime() > now,
    );
  },
});

export const proRequestsQuery = queryOptions({
  queryKey: ["pro-requests"],
  queryFn: async (): Promise<ProRequest[]> => {
    const { data, error } = await supabase
      .from("pro_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProRequest[];
  },
});

export function myProRequestsQuery(profileId: string | undefined) {
  return queryOptions({
    queryKey: ["my-pro-requests", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<ProRequest[]> => {
      const { data, error } = await supabase
        .from("pro_requests")
        .select("*")
        .eq("provider_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProRequest[];
    },
  });
}
