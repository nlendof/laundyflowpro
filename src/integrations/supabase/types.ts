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
      admin_discount_codes: {
        Row: {
          admin_id: string
          code: string
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          laundry_id: string | null
          uses_remaining: number | null
        }
        Insert: {
          admin_id: string
          code: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          uses_remaining?: number | null
        }
        Update: {
          admin_id?: string
          code?: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_discount_codes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_discount_codes_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          id: string
          laundry_id: string | null
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          id?: string
          laundry_id?: string | null
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          id?: string
          laundry_id?: string | null
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          laundry_id: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          laundry_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          laundry_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          backup_date: string
          created_at: string
          email_recipient: string | null
          email_sent: boolean | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          laundry_id: string | null
          status: string
          tables_backed_up: Json | null
        }
        Insert: {
          backup_date?: string
          created_at?: string
          email_recipient?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          laundry_id?: string | null
          status?: string
          tables_backed_up?: Json | null
        }
        Update: {
          backup_date?: string
          created_at?: string
          email_recipient?: string | null
          email_sent?: boolean | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          laundry_id?: string | null
          status?: string
          tables_backed_up?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          created_at: string
          day_of_week: number | null
          frequency: string
          id: string
          is_enabled: boolean
          last_backup_at: string | null
          laundry_id: string | null
          next_backup_at: string | null
          notification_email: string | null
          tables_to_backup: Json
          time_of_day: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          last_backup_at?: string | null
          laundry_id?: string | null
          next_backup_at?: string | null
          notification_email?: string | null
          tables_to_backup?: Json
          time_of_day?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          last_backup_at?: string | null
          laundry_id?: string | null
          next_backup_at?: string | null
          notification_email?: string | null
          tables_to_backup?: Json
          time_of_day?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_subscriptions: {
        Row: {
          billing_anchor_day: number | null
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          branch_id: string
          cancelled_at: string | null
          created_at: string | null
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_at: string | null
          next_payment_due: string | null
          past_due_since: string | null
          plan_id: string
          preferred_payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          suspended_at: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_anchor_day?: number | null
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          branch_id: string
          cancelled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_at?: string | null
          next_payment_due?: string | null
          past_due_since?: string | null
          plan_id: string
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_anchor_day?: number | null
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          branch_id?: string
          cancelled_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_at?: string | null
          next_payment_due?: string | null
          past_due_since?: string | null
          plan_id?: string
          preferred_payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          laundry_id: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          laundry_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          laundry_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closings: {
        Row: {
          actual_balance: number | null
          closed_by: string | null
          closing_date: string
          created_at: string | null
          difference: number | null
          expected_balance: number
          id: string
          laundry_id: string | null
          notes: string | null
          opening_balance: number
          total_expense: number
          total_income: number
        }
        Insert: {
          actual_balance?: number | null
          closed_by?: string | null
          closing_date: string
          created_at?: string | null
          difference?: number | null
          expected_balance?: number
          id?: string
          laundry_id?: string | null
          notes?: string | null
          opening_balance?: number
          total_expense?: number
          total_income?: number
        }
        Update: {
          actual_balance?: number | null
          closed_by?: string | null
          closing_date?: string
          created_at?: string | null
          difference?: number | null
          expected_balance?: number
          id?: string
          laundry_id?: string | null
          notes?: string | null
          opening_balance?: number
          total_expense?: number
          total_income?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_type: string
          id: string
          laundry_id: string | null
          order_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type: string
          id?: string
          laundry_id?: string | null
          order_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          laundry_id?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_articles: {
        Row: {
          category: string
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          laundry_id: string | null
          min_stock: number | null
          name: string
          price: number
          stock: number | null
          track_inventory: boolean | null
          updated_at: string | null
        }
        Insert: {
          category: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          min_stock?: number | null
          name: string
          price: number
          stock?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          min_stock?: number | null
          name?: string
          price?: number
          stock?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_articles_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_extras: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          laundry_id: string | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_extras_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          estimated_time: number | null
          id: string
          is_active: boolean | null
          laundry_id: string | null
          name: string
          price: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          name: string
          price: number
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          estimated_time?: number | null
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          name?: string
          price?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_services_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          created_at: string | null
          customer_id: string
          delivery_instructions: string | null
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          customer_id: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          customer_id?: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          delivery_notes: string | null
          id: string
          phone: string | null
          preferred_delivery_time: string | null
          preferred_pickup_time: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          id: string
          phone?: string | null
          preferred_delivery_time?: string | null
          preferred_pickup_time?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          id?: string
          phone?: string | null
          preferred_delivery_time?: string | null
          preferred_pickup_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          email: string | null
          id: string
          laundry_id: string | null
          name: string
          nickname: string | null
          notes: string | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          laundry_id?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          laundry_id?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_confirmation_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          laundry_id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          laundry_id: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          laundry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_confirmation_codes_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deduction_frequency: string | null
          employee_id: string
          id: string
          laundry_id: string | null
          monthly_deduction: number | null
          reason: string | null
          remaining_amount: number
          status: string
          updated_at: string
          weekly_deduction: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deduction_frequency?: string | null
          employee_id: string
          id?: string
          laundry_id?: string | null
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount: number
          status?: string
          updated_at?: string
          weekly_deduction?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deduction_frequency?: string | null
          employee_id?: string
          id?: string
          laundry_id?: string | null
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount?: number
          status?: string
          updated_at?: string
          weekly_deduction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          base_salary: number
          created_at: string | null
          created_by: string | null
          currency: string
          effective_date: string
          id: string
          laundry_id: string | null
          notes: string | null
          salary_type: string
          user_id: string
        }
        Insert: {
          base_salary?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          laundry_id?: string | null
          notes?: string | null
          salary_type?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          laundry_id?: string | null
          notes?: string | null
          salary_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          laundry_id: string | null
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          laundry_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          laundry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string | null
          current_stock: number
          id: string
          last_restocked: string | null
          laundry_id: string | null
          min_stock: number
          name: string
          unit: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          current_stock?: number
          id?: string
          last_restocked?: string | null
          laundry_id?: string | null
          min_stock?: number
          name: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          current_stock?: number
          id?: string
          last_restocked?: string | null
          laundry_id?: string | null
          min_stock?: number
          name?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          movement_type: string
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          movement_type: string
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          movement_type?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      laundries: {
        Row: {
          address: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          subscription_status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      laundry_users: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          laundry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          laundry_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          laundry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_users_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
          payroll_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
          payroll_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
          payroll_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "employee_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          article_id: string | null
          created_at: string | null
          extras: Json | null
          id: string
          item_type: Database["public"]["Enums"]["item_type"]
          name: string
          order_id: string
          quantity: number
          service_id: string | null
          unit_price: number
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          extras?: Json | null
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          name: string
          order_id: string
          quantity: number
          service_id?: string | null
          unit_price: number
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          extras?: Json | null
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          name?: string
          order_id?: string
          quantity?: number
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "catalog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "catalog_services"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          created_at: string | null
          id: string
          laundry_id: string | null
          notes: string | null
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          refund_amount: number
          refund_method: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          laundry_id?: string | null
          notes?: string | null
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          refund_amount?: number
          refund_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          laundry_id?: string | null
          notes?: string | null
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          refund_amount?: number
          refund_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_completed_at: string | null
          delivery_cost: number | null
          delivery_driver_id: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_slot: string | null
          discount_amount: number | null
          estimated_ready_at: string | null
          id: string
          is_paid: boolean | null
          item_checks: Json | null
          laundry_id: string | null
          needs_delivery: boolean | null
          needs_pickup: boolean | null
          notes: string | null
          paid_amount: number | null
          pickup_address: string | null
          pickup_completed_at: string | null
          pickup_cost: number | null
          pickup_driver_id: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_slot: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          ticket_code: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_completed_at?: string | null
          delivery_cost?: number | null
          delivery_driver_id?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_slot?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          id?: string
          is_paid?: boolean | null
          item_checks?: Json | null
          laundry_id?: string | null
          needs_delivery?: boolean | null
          needs_pickup?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          pickup_address?: string | null
          pickup_completed_at?: string | null
          pickup_cost?: number | null
          pickup_driver_id?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_slot?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          ticket_code: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_completed_at?: string | null
          delivery_cost?: number | null
          delivery_driver_id?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_slot?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          id?: string
          is_paid?: boolean | null
          item_checks?: Json | null
          laundry_id?: string | null
          needs_delivery?: boolean | null
          needs_pickup?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          pickup_address?: string | null
          pickup_completed_at?: string | null
          pickup_cost?: number | null
          pickup_driver_id?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_slot?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          ticket_code?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          payroll_id: string
        }
        Insert: {
          adjustment_type: string
          amount?: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          payroll_id: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          payroll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          bonuses: number
          created_at: string | null
          created_by: string | null
          deductions: number
          id: string
          laundry_id: string | null
          notes: string | null
          overtime_amount: number
          overtime_hours: number
          payment_date: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonuses?: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number
          id?: string
          laundry_id?: string | null
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number
          payment_date?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          bonuses?: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number
          id?: string
          laundry_id?: string | null
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number
          payment_date?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string | null
          email: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          laundry_id: string | null
          must_change_password: boolean | null
          name: string
          phone: string | null
          profile_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          email: string
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          laundry_id?: string | null
          must_change_password?: boolean | null
          name: string
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          laundry_id?: string | null
          must_change_password?: boolean | null
          name?: string
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          inventory_id: string | null
          item_name: string
          item_type: string
          purchase_id: string
          quantity: number
          stock_action: string
          stock_before: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          item_name: string
          item_type?: string
          purchase_id: string
          quantity: number
          stock_action?: string
          stock_before?: number
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          item_name?: string
          item_type?: string
          purchase_id?: string
          quantity?: number
          stock_action?: string
          stock_before?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "catalog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          laundry_id: string | null
          notes: string | null
          purchase_date: string
          status: string
          supplier_name: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          laundry_id?: string | null
          notes?: string | null
          purchase_date?: string
          status?: string
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          laundry_id?: string | null
          notes?: string | null
          purchase_date?: string
          status?: string
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          job_name: string
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          job_name: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          job_name?: string
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          billing_address: string | null
          billing_name: string | null
          billing_tax_id: string | null
          branch_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          payment_id: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string | null
          subscription_id: string
          subtotal: number
          tax_amount: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_name?: string | null
          billing_tax_id?: string | null
          branch_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string | null
          subscription_id: string
          subtotal: number
          tax_amount?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_name?: string | null
          billing_tax_id?: string | null
          branch_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          subscription_id?: string
          subtotal?: number
          tax_amount?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "branch_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_notifications: {
        Row: {
          body: string | null
          branch_id: string
          channel: string
          created_at: string | null
          id: string
          notification_type: string
          recipient_email: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          subscription_id: string
        }
        Insert: {
          body?: string | null
          branch_id: string
          channel: string
          created_at?: string | null
          id?: string
          notification_type: string
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          subscription_id: string
        }
        Update: {
          body?: string | null
          branch_id?: string
          channel?: string
          created_at?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "branch_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          bank_reference: string | null
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          metadata: Json | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          period_end: string
          period_start: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          branch_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          period_end: string
          period_start: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          branch_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          period_end?: string
          period_start?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "branch_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          name: string
          price_annual: number
          price_monthly: number
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price_annual: number
          price_monthly: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_annual?: number
          price_monthly?: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          id: string
          key: string
          laundry_id: string | null
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          laundry_id?: string | null
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          laundry_id?: string | null
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string
          id: string
          laundry_id: string | null
          reason: string | null
          request_type: string
          response_notes: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          laundry_id?: string | null
          reason?: string | null
          request_type: string
          response_notes?: string | null
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          laundry_id?: string | null
          reason?: string | null
          request_type?: string
          response_notes?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          module_key: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_key: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          laundry_id: string | null
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          start_time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          laundry_id?: string | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      check_branch_subscription_status: {
        Args: { p_branch_id: string }
        Returns: {
          can_operate: boolean
          days_until_suspension: number
          is_in_grace_period: boolean
          message: string
          status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      cleanup_expired_deletion_codes: { Args: never; Returns: undefined }
      get_user_branch_id: { Args: { _user_id: string }; Returns: string }
      get_user_laundry_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_branch_admin:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _branch_id: string; _user_id: string }; Returns: boolean }
      is_customer: { Args: { _user_id: string }; Returns: boolean }
      is_general_admin: { Args: { _user_id: string }; Returns: boolean }
      is_laundry_admin: {
        Args: { _laundry_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner_or_technician: { Args: { _user_id: string }; Returns: boolean }
      process_subscription_expirations: { Args: never; Returns: undefined }
      user_belongs_to_laundry: {
        Args: { _laundry_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "cajero"
        | "operador"
        | "delivery"
        | "cliente"
        | "owner"
        | "technician"
      billing_interval: "monthly" | "annual"
      expense_category: "rent" | "utilities" | "payroll" | "supplies" | "other"
      inventory_category: "detergent" | "softener" | "stain_remover" | "other"
      item_type: "weight" | "piece"
      order_status:
        | "pending_pickup"
        | "in_store"
        | "washing"
        | "drying"
        | "ironing"
        | "ready_delivery"
        | "in_transit"
        | "delivered"
      payment_method_type: "card" | "bank_transfer"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled"
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
      app_role: [
        "admin",
        "cajero",
        "operador",
        "delivery",
        "cliente",
        "owner",
        "technician",
      ],
      billing_interval: ["monthly", "annual"],
      expense_category: ["rent", "utilities", "payroll", "supplies", "other"],
      inventory_category: ["detergent", "softener", "stain_remover", "other"],
      item_type: ["weight", "piece"],
      order_status: [
        "pending_pickup",
        "in_store",
        "washing",
        "drying",
        "ironing",
        "ready_delivery",
        "in_transit",
        "delivered",
      ],
      payment_method_type: ["card", "bank_transfer"],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "suspended",
        "cancelled",
      ],
    },
  },
} as const
