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
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          id: string
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
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
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
          status?: string
          tables_backed_up?: Json | null
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          created_at: string
          day_of_week: number | null
          frequency: string
          id: string
          is_enabled: boolean
          last_backup_at: string | null
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
          next_backup_at?: string | null
          notification_email?: string | null
          tables_to_backup?: Json
          time_of_day?: string
          updated_at?: string
        }
        Relationships: []
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
          notes?: string | null
          opening_balance?: number
          total_expense?: number
          total_income?: number
        }
        Relationships: []
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
          order_id?: string | null
        }
        Relationships: [
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
          min_stock?: number | null
          name?: string
          price?: number
          stock?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalog_extras: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      catalog_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          estimated_time: number | null
          id: string
          is_active: boolean | null
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
          name?: string
          price?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_loans: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          monthly_deduction: number | null
          reason: string | null
          remaining_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_amount?: number
          status?: string
          updated_at?: string
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
          notes?: string | null
          salary_type?: string
          user_id?: string
        }
        Relationships: []
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
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string | null
          current_stock: number
          id: string
          last_restocked: string | null
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
          min_stock?: number
          name?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      orders: {
        Row: {
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
          delivery_slot: string | null
          discount_amount: number | null
          estimated_ready_at: string | null
          id: string
          is_paid: boolean | null
          item_checks: Json | null
          needs_delivery: boolean | null
          needs_pickup: boolean | null
          notes: string | null
          paid_amount: number | null
          pickup_address: string | null
          pickup_completed_at: string | null
          pickup_cost: number | null
          pickup_driver_id: string | null
          pickup_slot: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          ticket_code: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
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
          delivery_slot?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          id?: string
          is_paid?: boolean | null
          item_checks?: Json | null
          needs_delivery?: boolean | null
          needs_pickup?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          pickup_address?: string | null
          pickup_completed_at?: string | null
          pickup_cost?: number | null
          pickup_driver_id?: string | null
          pickup_slot?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          ticket_code: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
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
          delivery_slot?: string | null
          discount_amount?: number | null
          estimated_ready_at?: string | null
          id?: string
          is_paid?: boolean | null
          item_checks?: Json | null
          needs_delivery?: boolean | null
          needs_pickup?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          pickup_address?: string | null
          pickup_completed_at?: string | null
          pickup_cost?: number | null
          pickup_driver_id?: string | null
          pickup_slot?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          ticket_code?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          must_change_password: boolean | null
          name: string
          phone: string | null
          profile_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          name: string
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          name?: string
          phone?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
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
          notes?: string | null
          purchase_date?: string
          status?: string
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string
          id: string
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
          reason?: string | null
          request_type?: string
          response_notes?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "cajero" | "operador" | "delivery"
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
      app_role: ["admin", "cajero", "operador", "delivery"],
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
    },
  },
} as const
