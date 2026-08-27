// TypeScript types for the Narkadhai application

export interface Member {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  created_at: string;
}


export interface Album {
  id: string;
  home_name: string;
  visit_date: string;
  description: string | null;
  cover_photo_url: string | null;
  created_at: string;
}

export interface AlbumPhoto {
  id: string;
  album_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface AlbumWithPhotos extends Album {
  photos: AlbumPhoto[];
}

export interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  utr_or_txn_id: string | null;
  screenshot_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  payment_qr_used?: 'primary' | 'backup' | string;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
}

export interface DonationTotals {
  reported_total: number;
  verified_total: number;
  reported_count: number;
  verified_count: number;
}

export interface Settings {
  donation_target_amount?: string;
  qr_code_url?: string;
  qr_code_url_2?: string;
  qr_code_label_2?: string;
  instagram_url?: string;
  instagram_handle?: string;
  mission_text?: string;
  about_text?: string;
  contact_email?: string;
  owner_name?: string;
  owner_bio?: string;
  owner_photo_url?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface AuthorizedAdmin {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'audit';
  created_at: string;
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'owner' | 'audit';
}

export interface CommunityMessage {
  id: string;
  name: string;
  message: string;
  is_approved: boolean;
  created_at: string;
}

