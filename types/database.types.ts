export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          sector: string | null
          product_info: string | null
          avg_product_cost: string | null
          product_types: string[] | null
          audience: string | null
          differentiators: Json | null
          customer_benefits: Json | null
          company_benefits: Json | null
          uploads_professional_materials: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sector?: string | null
          product_info?: string | null
          avg_product_cost?: string | null
          product_types?: string[] | null
          audience?: string | null
          differentiators?: Json | null
          customer_benefits?: Json | null
          company_benefits?: Json | null
          uploads_professional_materials?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sector?: string | null
          product_info?: string | null
          avg_product_cost?: string | null
          product_types?: string[] | null
          audience?: string | null
          differentiators?: Json | null
          customer_benefits?: Json | null
          company_benefits?: Json | null
          uploads_professional_materials?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          role: string
          full_name: string | null
          email: string
          created_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          role: string
          full_name?: string | null
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          role?: string
          full_name?: string | null
          email?: string
          created_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          user_id: string
          company_id: string
          call_type: string
          audio_file_path: string | null
          audio_duration_seconds: number | null
          transcript: string | null
          analysis_report: Json | null
          tone_analysis_report: Json | null
          overall_score: number | null
          red_flag: boolean
          agent_notes: string | null
          processing_status: string
          error_message: string | null
          analysis_type: string
          created_at: string
          analyzed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          call_type: string
          audio_file_path?: string | null
          audio_duration_seconds?: number | null
          transcript?: string | null
          analysis_report?: Json | null
          tone_analysis_report?: Json | null
          overall_score?: number | null
          red_flag?: boolean
          agent_notes?: string | null
          processing_status?: string
          error_message?: string | null
          analysis_type?: string
          created_at?: string
          analyzed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          call_type?: string
          audio_file_path?: string | null
          audio_duration_seconds?: number | null
          transcript?: string | null
          analysis_report?: Json | null
          tone_analysis_report?: Json | null
          overall_score?: number | null
          red_flag?: boolean
          agent_notes?: string | null
          processing_status?: string
          error_message?: string | null
          analysis_type?: string
          created_at?: string
          analyzed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 