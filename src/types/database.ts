// =============================================================
// Global Connect — Database Types
// Formato exacto que espera @supabase/supabase-js v2.40+
// =============================================================

export type EstablishmentCategory =
  | 'restaurant'
  | 'bar'
  | 'club'
  | 'theater'
  | 'cafe'
  | 'sports'
  | 'cultural'
  | 'other'

export type AdminRole = 'admin' | 'super_admin'

// ------------------------------------------------------------------
// Tipos de fila (Row) — para usar como props en componentes
// ------------------------------------------------------------------
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Establishment = Database['public']['Tables']['establishments']['Row']
export type Promotion = Database['public']['Tables']['promotions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']

// ------------------------------------------------------------------
// Tipo Database — formato requerido por @supabase/supabase-js v2.40+
// ------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          university: string
          home_country: string
          exchange_country: string
          exchange_city: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          university: string
          home_country: string
          exchange_country: string
          exchange_city: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          university?: string
          home_country?: string
          exchange_country?: string
          exchange_city?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
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
          instagram: string | null
          price_range: '$' | '$$' | '$$$' | '$$$$' | null
          menu_pdf_url: string | null
          opening_hours: Record<string, string> | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: EstablishmentCategory
          address: string
          city: string
          country: string
          latitude?: number | null
          longitude?: number | null
          image_url?: string | null
          gallery_urls?: string[]
          phone?: string | null
          website?: string | null
          instagram?: string | null
          price_range?: '$' | '$$' | '$$$' | '$$$$' | null
          menu_pdf_url?: string | null
          opening_hours?: Record<string, string> | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: EstablishmentCategory
          address?: string
          city?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          image_url?: string | null
          gallery_urls?: string[]
          phone?: string | null
          website?: string | null
          instagram?: string | null
          price_range?: '$' | '$$' | '$$$' | '$$$$' | null
          menu_pdf_url?: string | null
          opening_hours?: Record<string, string> | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
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
        Insert: {
          id?: string
          establishment_id: string
          title: string
          description?: string | null
          original_price?: number | null
          discounted_price?: number | null
          discount_percentage?: number | null
          valid_from?: string | null
          valid_until?: string | null
          terms_conditions?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          title?: string
          description?: string | null
          original_price?: number | null
          discounted_price?: number | null
          discount_percentage?: number | null
          valid_from?: string | null
          valid_until?: string | null
          terms_conditions?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'promotions_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          display_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          display_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          display_order?: number
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          role: AdminRole
          created_at: string
        }
        Insert: {
          id: string
          role?: AdminRole
          created_at?: string
        }
        Update: {
          id?: string
          role?: AdminRole
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
