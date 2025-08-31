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
      agent_approval_requests: {
        Row: {
          id: string
          agent_id: string
          company_id: string
          requested_by: string
          status: string
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          company_id: string
          requested_by: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          company_id?: string
          requested_by?: string
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          company_id: string | null
          created_at: string
          updated_at: string | null
          is_approved: boolean | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          company_id?: string | null
          created_at?: string
          updated_at?: string | null
          is_approved?: boolean | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          company_id?: string | null
          created_at?: string
          updated_at?: string | null
          is_approved?: boolean | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          domain: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      calls: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          call_type: string
          customer_name: string | null
          audio_file_path: string
          transcript: string | null
          transcript_segments: Json | null
          transcript_words: Json | null
          analysis_report: Json | null
          tone_analysis_report: Json | null
          processing_status: string | null
          error_message: string | null
          overall_score: number | null
          red_flag: boolean | null
          agent_notes: string | null
          analysis_notes: string | null
          audio_duration_seconds: number | null
          analysis_type: string
          analyzed_at: string | null
          created_at: string
          updated_at: string | null
          content_analysis: Json | null
          tone_analysis: Json | null
          red_flags: string[] | null
          improvement_areas: string[] | null
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          call_type: string
          customer_name?: string | null
          audio_file_path: string
          transcript?: string | null
          transcript_segments?: Json | null
          transcript_words?: Json | null
          analysis_report?: Json | null
          tone_analysis_report?: Json | null
          processing_status?: string | null
          error_message?: string | null
          overall_score?: number | null
          red_flag?: boolean | null
          agent_notes?: string | null
          analysis_notes?: string | null
          audio_duration_seconds?: number | null
          analysis_type?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string | null
          content_analysis?: Json | null
          tone_analysis?: Json | null
          red_flags?: string[] | null
          improvement_areas?: string[] | null
          duration_seconds?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          call_type?: string
          customer_name?: string | null
          audio_file_path?: string
          transcript?: string | null
          transcript_segments?: Json | null
          transcript_words?: Json | null
          analysis_report?: Json | null
          tone_analysis_report?: Json | null
          processing_status?: string | null
          error_message?: string | null
          overall_score?: number | null
          red_flag?: boolean | null
          agent_notes?: string | null
          analysis_notes?: string | null
          audio_duration_seconds?: number | null
          analysis_type?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string | null
          content_analysis?: Json | null
          tone_analysis?: Json | null
          red_flags?: string[] | null
          improvement_areas?: string[] | null
          duration_seconds?: number | null
        }
      }
      simulations: {
        Row: {
          id: string
          agent_id: string
          company_id: string
          simulation_type: string
          customer_persona: string
          difficulty_level: string
          scenario_description: string
          status: string
          started_at: string | null
          completed_at: string | null
          duration_seconds: number | null
          transcript: string | null
          score: number | null
          ai_feedback: Json | null
          improvement_areas: Json | null
          coins_earned: number | null
          audio_file_path: string | null
          expires_at: string | null
          triggered_by_call_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          company_id: string
          simulation_type: string
          customer_persona: string
          difficulty_level: string
          scenario_description: string
          status?: string
          started_at?: string | null
          completed_at?: string | null
          duration_seconds?: number | null
          transcript?: string | null
          score?: number | null
          ai_feedback?: Json | null
          improvement_areas?: Json | null
          coins_earned?: number | null
          audio_file_path?: string | null
          expires_at?: string | null
          triggered_by_call_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          company_id?: string
          simulation_type?: string
          customer_persona?: string
          difficulty_level?: string
          scenario_description?: string
          status?: string
          started_at?: string | null
          completed_at?: string | null
          duration_seconds?: number | null
          transcript?: string | null
          score?: number | null
          ai_feedback?: Json | null
          improvement_areas?: Json | null
          coins_earned?: number | null
          audio_file_path?: string | null
          expires_at?: string | null
          triggered_by_call_id?: string | null
          created_at?: string
        }
      }
      customer_personas_hebrew: {
        Row: {
          id: string
          company_id: string
          created_by: string
          persona_name: string
          personality_type: string
          communication_style: string
          industry_context: string | null
          company_size: string | null
          background_story: string
          current_situation: string
          pain_points: string[]
          goals_and_objectives: string[]
          common_objections: string[]
          objection_patterns: Json | null
          objection_difficulty: string
          preferred_communication: string[]
          decision_making_style: string | null
          budget_sensitivity: string | null
          time_pressure: string | null
          openai_instructions: string
          scenario_templates: Json | null
          targets_weaknesses: string[]
          difficulty_level: string
          is_template: boolean
          is_active: boolean
          usage_count: number
          average_score: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          created_by: string
          persona_name: string
          personality_type: string
          communication_style: string
          industry_context?: string | null
          company_size?: string | null
          background_story: string
          current_situation: string
          pain_points?: string[]
          goals_and_objectives?: string[]
          common_objections?: string[]
          objection_patterns?: Json | null
          objection_difficulty: string
          preferred_communication?: string[]
          decision_making_style?: string | null
          budget_sensitivity?: string | null
          time_pressure?: string | null
          openai_instructions: string
          scenario_templates?: Json | null
          targets_weaknesses?: string[]
          difficulty_level: string
          is_template?: boolean
          is_active?: boolean
          usage_count?: number
          average_score?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          created_by?: string
          persona_name?: string
          personality_type?: string
          communication_style?: string
          industry_context?: string | null
          company_size?: string | null
          background_story?: string
          current_situation?: string
          pain_points?: string[]
          goals_and_objectives?: string[]
          common_objections?: string[]
          objection_patterns?: Json | null
          objection_difficulty?: string
          preferred_communication?: string[]
          decision_making_style?: string | null
          budget_sensitivity?: string | null
          time_pressure?: string | null
          openai_instructions?: string
          scenario_templates?: Json | null
          targets_weaknesses?: string[]
          difficulty_level?: string
          is_template?: boolean
          is_active?: boolean
          usage_count?: number
          average_score?: number | null
          created_at?: string
          updated_at?: string | null
        }
      }
      simulation_scenarios_hebrew: {
        Row: {
          id: string
          persona_id: string
          company_id: string
          scenario_title: string
          scenario_description: string
          learning_objectives: string[]
          expected_challenges: string[]
          success_criteria: string
          difficulty_level: string
          estimated_duration: number
          openai_scenario_prompt: string
          scenario_flow: Json | null
          is_active: boolean
          usage_count: number
          average_rating: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          persona_id: string
          company_id: string
          scenario_title: string
          scenario_description: string
          learning_objectives?: string[]
          expected_challenges?: string[]
          success_criteria: string
          difficulty_level: string
          estimated_duration: number
          openai_scenario_prompt: string
          scenario_flow?: Json | null
          is_active?: boolean
          usage_count?: number
          average_rating?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          persona_id?: string
          company_id?: string
          scenario_title?: string
          scenario_description?: string
          learning_objectives?: string[]
          expected_challenges?: string[]
          success_criteria?: string
          difficulty_level?: string
          estimated_duration?: number
          openai_scenario_prompt?: string
          scenario_flow?: Json | null
          is_active?: boolean
          usage_count?: number
          average_rating?: number | null
          created_at?: string
          updated_at?: string | null
        }
      }
      simulation_reports_hebrew: {
        Row: {
          id: string
          simulation_id: string
          agent_id: string
          company_id: string
          overall_score: number
          detailed_scores: Json
          summary: string
          strengths: string[]
          improvement_areas: string[]
          specific_feedback: Json[]
          recommendations: string[]
          next_training_focus: string | null
          simulation_metrics: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          agent_id: string
          company_id: string
          overall_score: number
          detailed_scores: Json
          summary: string
          strengths?: string[]
          improvement_areas?: string[]
          specific_feedback?: Json[]
          recommendations?: string[]
          next_training_focus?: string | null
          simulation_metrics?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          agent_id?: string
          company_id?: string
          overall_score?: number
          detailed_scores?: Json
          summary?: string
          strengths?: string[]
          improvement_areas?: string[]
          specific_feedback?: Json[]
          recommendations?: string[]
          next_training_focus?: string | null
          simulation_metrics?: Json | null
          created_at?: string
        }
      }
      company_questionnaires: {
        Row: {
          id: string
          company_id: string
          industry: string | null
          product_service: string | null
          target_audience: string | null
          key_differentiator: string | null
          customer_benefits: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          industry?: string | null
          product_service?: string | null
          target_audience?: string | null
          key_differentiator?: string | null
          customer_benefits?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          industry?: string | null
          product_service?: string | null
          target_audience?: string | null
          key_differentiator?: string | null
          customer_benefits?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      agent_coins: {
        Row: {
          agent_id: string
          company_id: string
          total_coins: number
          last_earned: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          company_id: string
          total_coins?: number
          last_earned?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          total_coins?: number
          last_earned?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      agent_notifications: {
        Row: {
          id: string
          agent_id: string
          company_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          company_id: string
          title: string
          message: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          company_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          call_id: string
          message: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          message: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          message?: string
          details?: Json | null
          created_at?: string
        }
      }
      company_subscriptions: {
        Row: {
          id: string
          company_id: string
          plan_id: string
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          plan_id: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          plan_id?: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price: number
          features: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          features: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          features?: Json
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
