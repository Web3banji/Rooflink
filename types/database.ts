export type UserRole = "student" | "agent" | "landlord" | "admin";
export type ListingStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";
export type EnquiryStatus = "open" | "responded" | "closed";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  university_id: string | null;
  is_active: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface University {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_profile_id: string;
  lister_role: "agent" | "landlord";
  university_id: string;
  title: string;
  description: string;
  property_type: string;
  address_text: string;
  price_amount: number;
  price_period: string;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  availability_status: string;
  status: ListingStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface SavedProperty {
  id: string;
  student_profile_id: string;
  property_id: string;
  created_at: string;
}

export interface Enquiry {
  id: string;
  property_id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  message: string;
  status: EnquiryStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_profile_id: string | null;
  property_id: string | null;
  target_profile_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditRecord {
  id: string;
  actor_profile_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
