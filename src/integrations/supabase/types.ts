export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          can_approve_reject: boolean
          can_manage_admins: boolean
          can_manage_coupons: boolean
          created_at: string
          granted_by: string
          id: string
          is_super_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve_reject?: boolean
          can_manage_admins?: boolean
          can_manage_coupons?: boolean
          created_at?: string
          granted_by: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve_reject?: boolean
          can_manage_admins?: boolean
          can_manage_coupons?: boolean
          created_at?: string
          granted_by?: string
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          chapter_number: number
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          book_id: string
          chapter_number: number
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Update: {
          book_id?: string
          chapter_number?: number
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_purchases: {
        Row: {
          amount: number
          book_id: string
          id: string
          payment_status: string
          payu_txnid: string | null
          purchased_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          book_id: string
          id?: string
          payment_status?: string
          payu_txnid?: string | null
          purchased_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          book_id?: string
          id?: string
          payment_status?: string
          payu_txnid?: string | null
          purchased_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      book_submissions: {
        Row: {
          admin_feedback: string | null
          author_id: string
          cover_color: string
          cover_image_url: string | null
          description: string
          free_chapters: number
          genre: string
          id: string
          manuscript_url: string | null
          price: number
          rating: number
          read_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          title: string
          total_chapters: number
        }
        Insert: {
          admin_feedback?: string | null
          author_id: string
          cover_color?: string
          cover_image_url?: string | null
          description: string
          free_chapters?: number
          genre: string
          id?: string
          manuscript_url?: string | null
          price?: number
          rating?: number
          read_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          title: string
          total_chapters?: number
        }
        Update: {
          admin_feedback?: string | null
          author_id?: string
          cover_color?: string
          cover_image_url?: string | null
          description?: string
          free_chapters?: number
          genre?: string
          id?: string
          manuscript_url?: string | null
          price?: number
          rating?: number
          read_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          title?: string
          total_chapters?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          book_id: string
          chapter_number: number
          created_at: string
          highlighted_text: string | null
          id: string
          note: string | null
          scroll_position: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_number: number
          created_at?: string
          highlighted_text?: string | null
          id?: string
          note?: string | null
          scroll_position?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_number?: number
          created_at?: string
          highlighted_text?: string | null
          id?: string
          note?: string | null
          scroll_position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          book_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string
          current_chapter: number
          id: string
          last_read_at: string
          scroll_position: number | null
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          current_chapter?: number
          id?: string
          last_read_at?: string
          scroll_position?: number | null
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          current_chapter?: number
          id?: string
          last_read_at?: string
          scroll_position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: {
        Args: {
          p_can_approve_reject?: boolean
          p_can_manage_admins?: boolean
          p_can_manage_coupons?: boolean
          p_granted_by?: string
          target_email: string
        }
        Returns: undefined
      }
      get_admins_with_emails: {
        Args: never
        Returns: {
          can_approve_reject: boolean
          can_manage_admins: boolean
          can_manage_coupons: boolean
          created_at: string
          display_name: string
          email: string
          granted_by: string
          id: string
          is_super_admin: boolean
          user_id: string
        }[]
      }
      has_purchased_book: {
        Args: { p_book_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_book_approved: { Args: { book_uuid: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "author" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "author", "user"],
    },
  },
} as const
