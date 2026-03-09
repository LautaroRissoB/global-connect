// =============================================================
// Global Connect — Database Types
// Corresponden 1:1 con las tablas de Supabase
// =============================================================

export interface Profile {
  id: string
  full_name: string
  university: string
  home_country: string
  exchange_country: string
  exchange_city: string
  avatar_url: string | null
  created_at: string
}

export type EstablishmentCategory =
  | 'restaurant'
  | 'bar'
  | 'club'
  | 'theater'
  | 'cafe'
  | 'sports'
  | 'cultural'
  | 'other'

export interface Establishment {
  id: string
  name: string
  description: string | null
  category: EstablishmentCategory
  address: string
  city: string
  country: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
  gallery_urls: string[]
  phone: string | null
  website: string | null
  opening_hours: Record<string, string> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Promotion {
  id: string
  establishment_id: string
  title: string
  description: string | null
  original_price: number | null
  discounted_price: number | null
  discount_percentage: number | null
  valid_from: string | null
  valid_until: string | null
  terms_conditions: string | null
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  display_order: number
}

export type AdminRole = 'admin' | 'super_admin'

export interface AdminUser {
  id: string
  role: AdminRole
  created_at: string
}

// =============================================================
// Tipo Database para usar con el cliente de Supabase tipado
// =============================================================
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      establishments: {
        Row: Establishment
        Insert: Omit<Establishment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Establishment, 'id' | 'created_at' | 'updated_at'>>
      }
      promotions: {
        Row: Promotion
        Insert: Omit<Promotion, 'id' | 'created_at'>
        Update: Partial<Omit<Promotion, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id'>
        Update: Partial<Omit<Category, 'id'>>
      }
      admin_users: {
        Row: AdminUser
        Insert: Omit<AdminUser, 'created_at'>
        Update: Partial<Pick<AdminUser, 'role'>>
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
