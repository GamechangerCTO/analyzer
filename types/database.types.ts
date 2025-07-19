export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_approval_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          manager_id: string | null
          requested_by: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          manager_id?: string | null
          requested_by: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          manager_id?: string | null
          requested_by?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_approval_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agent_approval_requests_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_coins: {
        Row: {
          company_id: string
          created_at: string
          earned_today: number
          id: string
          last_activity_date: string | null
          streak_days: number
          total_coins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          earned_today?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_coins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          earned_today?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_coins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_coins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_coins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agent_coins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_notifications: {
        Row: {
          action_url: string | null
          company_id: string
          created_at: string
          id: string
          is_email_sent: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_email_sent?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_email_sent?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "agent_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_id: string
          created_at: string | null
          data: Json | null
          id: string
          message: string
        }
        Insert: {
          call_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
        }
        Update: {
          call_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_notes: string | null
          analysis_notes: string | null
          analysis_report: Json | null
          analysis_type: string | null
          analyzed_at: string | null
          audio_duration_seconds: number | null
          audio_file_path: string | null
          duration_seconds: number | null
          duration_minutes: number | null
          call_type: string
          company_id: string | null
          created_at: string
          customer_name: string | null
          error_message: string | null
          id: string
          overall_score: number | null
          processing_status: string | null
          red_flag: boolean | null
          tone_analysis_report: Json | null
          transcript: string | null
          transcript_segments: Json | null
          transcript_words: Json | null
          user_id: string | null
        }
        Insert: {
          agent_notes?: string | null
          analysis_notes?: string | null
          analysis_report?: Json | null
          analysis_type?: string | null
          analyzed_at?: string | null
          audio_duration_seconds?: number | null
          audio_file_path?: string | null
          duration_seconds?: number | null
          duration_minutes?: number | null
          call_type: string
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          id?: string
          overall_score?: number | null
          processing_status?: string | null
          red_flag?: boolean | null
          tone_analysis_report?: Json | null
          transcript?: string | null
          transcript_segments?: Json | null
          transcript_words?: Json | null
          user_id?: string | null
        }
        Update: {
          agent_notes?: string | null
          analysis_notes?: string | null
          analysis_report?: Json | null
          analysis_type?: string | null
          analyzed_at?: string | null
          audio_duration_seconds?: number | null
          audio_file_path?: string | null
          duration_seconds?: number | null
          duration_minutes?: number | null
          call_type?: string
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          id?: string
          overall_score?: number | null
          processing_status?: string | null
          red_flag?: boolean | null
          tone_analysis_report?: Json | null
          transcript?: string | null
          transcript_segments?: Json | null
          transcript_words?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          call_id: string | null
          coins_amount: number
          company_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          simulation_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          call_id?: string | null
          coins_amount: number
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          simulation_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          call_id?: string | null
          coins_amount?: number
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          simulation_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "coin_transactions_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          audience: string | null
          avg_product_cost: string | null
          company_benefits: Json | null
          created_at: string
          customer_benefits: Json | null
          differentiators: Json | null
          id: string
          name: string
          product_info: string | null
          product_types: string[] | null
          sector: string | null
          uploads_professional_materials: boolean | null
          is_poc: boolean | null
        }
        Insert: {
          audience?: string | null
          avg_product_cost?: string | null
          company_benefits?: Json | null
          created_at?: string
          customer_benefits?: Json | null
          differentiators?: Json | null
          id?: string
          name: string
          product_info?: string | null
          product_types?: string[] | null
          sector?: string | null
          uploads_professional_materials?: boolean | null
          is_poc?: boolean | null
        }
        Update: {
          audience?: string | null
          avg_product_cost?: string | null
          company_benefits?: Json | null
          created_at?: string
          customer_benefits?: Json | null
          differentiators?: Json | null
          id?: string
          name?: string
          product_info?: string | null
          product_types?: string[] | null
          sector?: string | null
          uploads_professional_materials?: boolean | null
          is_poc?: boolean | null
        }
        Relationships: []
      }
      company_questionnaires: {
        Row: {
          audience: string
          avg_product_cost: string
          company_benefits: string[]
          company_id: string
          completed_at: string | null
          completion_score: number | null
          created_at: string
          customer_benefits: string[]
          differentiators: string[]
          id: string
          is_complete: boolean | null
          name: string
          product_info: string
          product_types: string[]
          professional_materials_files: string[] | null
          sector: string
          updated_at: string
          uploads_professional_materials: boolean | null
        }
        Insert: {
          audience: string
          avg_product_cost: string
          company_benefits?: string[]
          company_id: string
          completed_at?: string | null
          completion_score?: number | null
          created_at?: string
          customer_benefits?: string[]
          differentiators?: string[]
          id?: string
          is_complete?: boolean | null
          name: string
          product_info: string
          product_types?: string[]
          professional_materials_files?: string[] | null
          sector: string
          updated_at?: string
          uploads_professional_materials?: boolean | null
        }
        Update: {
          audience?: string
          avg_product_cost?: string
          company_benefits?: string[]
          company_id?: string
          completed_at?: string | null
          completion_score?: number | null
          created_at?: string
          customer_benefits?: string[]
          differentiators?: string[]
          id?: string
          is_complete?: boolean | null
          name?: string
          product_info?: string
          product_types?: string[]
          professional_materials_files?: string[] | null
          sector?: string
          updated_at?: string
          uploads_professional_materials?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_questionnaires_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_questionnaires_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          agents_count: number
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          agents_count?: number
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          starts_at?: string
          updated_at?: string | null
        }
        Update: {
          agents_count?: number
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_user_quotas: {
        Row: {
          available_users: number | null
          company_id: string
          created_at: string | null
          id: string
          total_users: number
          updated_at: string | null
          used_users: number
        }
        Insert: {
          available_users?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          total_users?: number
          updated_at?: string | null
          used_users?: number
        }
        Update: {
          available_users?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          total_users?: number
          updated_at?: string | null
          used_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_user_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_user_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_minutes_quotas: {
        Row: {
          id: string
          company_id: string
          total_minutes: number
          used_minutes: number
          available_minutes: number | null
          is_poc: boolean
          poc_limit_minutes: number | null
          can_purchase_additional: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          total_minutes?: number
          used_minutes?: number
          is_poc?: boolean
          poc_limit_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          total_minutes?: number
          used_minutes?: number
          is_poc?: boolean
          poc_limit_minutes?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_minutes_quotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          call_type: string
          created_at: string
          id: string
          is_active: boolean | null
          parameters_schema: Json | null
          system_prompt: string
          updated_at: string | null
          user_prompt_template: string | null
          version: number | null
        }
        Insert: {
          call_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          parameters_schema?: Json | null
          system_prompt: string
          updated_at?: string | null
          user_prompt_template?: string | null
          version?: number | null
        }
        Update: {
          call_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          parameters_schema?: Json | null
          system_prompt?: string
          updated_at?: string | null
          user_prompt_template?: string | null
          version?: number | null
        }
        Relationships: []
      }
      simulation_dialogues: {
        Row: {
          audio_chunk_url: string | null
          created_at: string
          id: string
          message_text: string | null
          sender: string
          simulation_id: string
          timestamp_ms: number
        }
        Insert: {
          audio_chunk_url?: string | null
          created_at?: string
          id?: string
          message_text?: string | null
          sender: string
          simulation_id: string
          timestamp_ms: number
        }
        Update: {
          audio_chunk_url?: string | null
          created_at?: string
          id?: string
          message_text?: string | null
          sender?: string
          simulation_id?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulation_dialogues_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          agent_id: string
          ai_feedback: Json | null
          audio_file_path: string | null
          coins_earned: number | null
          company_id: string
          completed_at: string | null
          created_at: string
          customer_persona: string
          difficulty_level: string
          duration_seconds: number | null
          expires_at: string | null
          id: string
          improvement_areas: Json | null
          scenario_description: string
          score: number | null
          simulation_type: string
          started_at: string | null
          status: string
          transcript: string | null
          triggered_by_call_id: string | null
        }
        Insert: {
          agent_id: string
          ai_feedback?: Json | null
          audio_file_path?: string | null
          coins_earned?: number | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          customer_persona: string
          difficulty_level?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          improvement_areas?: Json | null
          scenario_description: string
          score?: number | null
          simulation_type: string
          started_at?: string | null
          status?: string
          transcript?: string | null
          triggered_by_call_id?: string | null
        }
        Update: {
          agent_id?: string
          ai_feedback?: Json | null
          audio_file_path?: string | null
          coins_earned?: number | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_persona?: string
          difficulty_level?: string
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          improvement_areas?: Json | null
          scenario_description?: string
          score?: number | null
          simulation_type?: string
          started_at?: string | null
          status?: string
          transcript?: string | null
          triggered_by_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "simulations_triggered_by_call_id_fkey"
            columns: ["triggered_by_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          max_agents: number
          name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_agents?: number
          name: string
          price_monthly: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_agents?: number
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      system_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          manager_id: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          manager_id?: string | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          manager_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_questionnaire_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          base_agents: number
          base_minutes: number
          monthly_price: number
          yearly_price: number | null
          features: Json
          is_active: boolean
          is_popular: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          base_agents?: number
          base_minutes?: number
          monthly_price: number
          yearly_price?: number | null
          features?: Json
          is_active?: boolean
          is_popular?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          base_agents?: number
          base_minutes?: number
          monthly_price?: number
          yearly_price?: number | null
          features?: Json
          is_active?: boolean
          is_popular?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          id: string
          company_id: string
          package_id: string
          status: string
          billing_cycle: string
          current_agents: number
          current_minutes: number
          next_billing_date: string | null
          trial_ends_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          package_id: string
          status?: string
          billing_cycle?: string
          current_agents?: number
          current_minutes?: number
          next_billing_date?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          package_id?: string
          status?: string
          billing_cycle?: string
          current_agents?: number
          current_minutes?: number
          next_billing_date?: string | null
          trial_ends_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          }
        ]
      }
      billing_history: {
        Row: {
          id: string
          company_id: string
          subscription_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          amount: number
          agents_count: number
          base_package_price: number
          additional_agents_price: number
          status: string
          payment_method: string | null
          payment_transaction_id: string | null
          stripe_invoice_id: string | null
          paid_at: string | null
          due_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          subscription_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          amount: number
          agents_count: number
          base_package_price: number
          additional_agents_price?: number
          status?: string
          payment_method?: string | null
          payment_transaction_id?: string | null
          stripe_invoice_id?: string | null
          paid_at?: string | null
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          subscription_id?: string
          invoice_number?: string
          billing_period_start?: string
          billing_period_end?: string
          amount?: number
          agents_count?: number
          base_package_price?: number
          additional_agents_price?: number
          status?: string
          payment_method?: string | null
          payment_transaction_id?: string | null
          stripe_invoice_id?: string | null
          paid_at?: string | null
          due_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_pricing_tiers: {
        Row: {
          id: string
          min_agents: number
          max_agents: number | null
          price_per_agent: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          min_agents: number
          max_agents?: number | null
          price_per_agent: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          min_agents?: number
          max_agents?: number | null
          price_per_agent?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_questionnaire_status: {
        Row: {
          company_id: string | null
          company_name: string | null
          completed_at: string | null
          is_questionnaire_complete: boolean | null
          questionnaire_completion_score: number | null
          questionnaire_status: string | null
          questionnaire_updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_add_user_to_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      get_company_questionnaire_missing_fields: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_company_questionnaire_score: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_user_quota: {
        Args: { p_company_id: string }
        Returns: {
          total_users: number
          used_users: number
          available_users: number
        }[]
      }
      insert_call: {
        Args:
          | {
              p_user_id: string
              p_call_type: string
              p_audio_file_path: string
              p_company_id?: string
              p_agent_notes?: string
              p_analysis_notes?: string
              p_analysis_type?: string
            }
          | {
              p_user_id: string
              p_company_id: string
              p_call_type: string
              p_audio_file_path: string
              p_agent_notes: string
              p_analysis_type: string
            }
        Returns: {
          agent_notes: string | null
          analysis_notes: string | null
          analysis_report: Json | null
          analysis_type: string | null
          analyzed_at: string | null
          audio_duration_seconds: number | null
          audio_file_path: string | null
          call_type: string
          company_id: string | null
          created_at: string
          error_message: string | null
          id: string
          overall_score: number | null
          processing_status: string | null
          red_flag: boolean | null
          tone_analysis_report: Json | null
          transcript: string | null
          transcript_segments: Json | null
          transcript_words: Json | null
          user_id: string | null
        }[]
      }
      is_company_questionnaire_complete: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      update_user_role: {
        Args: { user_id: string; new_role: string }
        Returns: undefined
      }
      can_process_call_duration: {
        Args: { p_company_id: string; p_estimated_minutes?: number }
        Returns: boolean
      }
      deduct_call_minutes: {
        Args: { p_company_id: string; p_call_id: string; p_actual_duration_seconds: number }
        Returns: boolean
      }
      get_company_minutes_quota: {
        Args: { p_company_id: string }
        Returns: {
          total_minutes: number
          used_minutes: number
          available_minutes: number
          is_poc: boolean
          can_purchase_additional: boolean
          usage_percentage: number
        }[]
      }
      add_minutes_to_company: {
        Args: { p_company_id: string; p_additional_minutes: number }
        Returns: boolean
      }
      get_manager_dashboard_stats: {
        Args: { company_uuid: string }
        Returns: {
          total_agents: number
          weekly_calls: number
          avg_score_weekly: number
          successful_calls_weekly: number
          today_calls: number
          yesterday_calls: number
          avg_score_overall: number
        }[]
      }
      get_company_agents_performance: {
        Args: { company_uuid: string }
        Returns: {
          id: string
          full_name: string
          avatar_url: string | null
          total_calls: number
          weekly_calls: number
          avg_score: number
          last_call_date: string | null
          activity_status: string
        }[]
      }

    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const 