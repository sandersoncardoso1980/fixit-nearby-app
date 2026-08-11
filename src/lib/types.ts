export type AppRole = "client" | "provider" | "admin";

export type RequestStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Profile = {
  id: string;
  user_id: string | null;
  role: AppRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  rating_avg: number;
  total_reviews: number;
  jobs_done: number;
  hourly_rate: number | null;
  is_online: boolean;
  coverage_radius_km: number;
  portfolio: string[];
  is_pro: boolean;
  is_verified: boolean;
  pro_expires_at: string | null;
  profile_views: number;
  contact_count: number;
  created_at: string;
};

export type Ad = {
  id: string;
  advertiser_name: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  phone: string | null;
  amount_paid: number;
  sort_order: number;
  is_active: boolean;
  category_id: string | null;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProRequestStatus = "pending" | "approved" | "rejected";

export type ProRequest = {
  id: string;
  provider_id: string;
  contact_phone: string | null;
  message: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  description: string | null;
  base_estimated_price: number;
};

export type ServiceRequest = {
  id: string;
  client_id: string;
  provider_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: RequestStatus;
  agreed_price: number | null;
  scheduled_at: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  request_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export const STATUS_STEPS: RequestStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Solicitado",
  accepted: "Prestador aceitou",
  in_progress: "Em execução",
  completed: "Concluído",
  cancelled: "Cancelado",
};
