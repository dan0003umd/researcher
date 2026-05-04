export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      faculty_profiles: {
        Row: {
          bio: string | null;
          currently_recruiting: boolean;
          desired_experience_level: Database["public"]["Enums"]["faculty_sought_experience_level"];
          department: string | null;
          display_name: string;
          google_scholar_url: string | null;
          lab_name: string | null;
          lab_url: string | null;
          orcid_url: string | null;
          recruiting_message: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio?: string | null;
          currently_recruiting?: boolean;
          desired_experience_level?: Database["public"]["Enums"]["faculty_sought_experience_level"];
          department?: string | null;
          display_name: string;
          google_scholar_url?: string | null;
          lab_name?: string | null;
          lab_url?: string | null;
          orcid_url?: string | null;
          recruiting_message?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bio?: string | null;
          currently_recruiting?: boolean;
          desired_experience_level?: Database["public"]["Enums"]["faculty_sought_experience_level"];
          department?: string | null;
          display_name?: string;
          google_scholar_url?: string | null;
          lab_name?: string | null;
          lab_url?: string | null;
          orcid_url?: string | null;
          recruiting_message?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faculty_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      interest_signals: {
        Row: {
          created_at: string | null;
          faculty_id: string | null;
          id: string;
          message: string | null;
          status: string | null;
          student_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          faculty_id?: string | null;
          id?: string;
          message?: string | null;
          status?: string | null;
          student_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          faculty_id?: string | null;
          id?: string;
          message?: string | null;
          status?: string | null;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interest_signals_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interest_signals_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_research_interests: {
        Row: {
          created_at: string;
          interest_id: number;
          is_primary: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          interest_id: number;
          is_primary?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          interest_id?: number;
          is_primary?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_research_interests_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "research_interests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_research_interests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_skills: {
        Row: {
          created_at: string;
          proficiency_level: Database["public"]["Enums"]["profile_skill_proficiency"];
          skill_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          proficiency_level?: Database["public"]["Enums"]["profile_skill_proficiency"];
          skill_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          proficiency_level?: Database["public"]["Enums"]["profile_skill_proficiency"];
          skill_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_skills_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          institutional_email: string | null;
          institutional_verified: boolean;
          role: Database["public"]["Enums"]["profile_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          institutional_email?: string | null;
          institutional_verified?: boolean;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institutional_email?: string | null;
          institutional_verified?: boolean;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      research_interests: {
        Row: {
          category: string;
          created_at: string;
          id: number;
          name: string;
          parent_id: number | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: never;
          name: string;
          parent_id?: number | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: never;
          name?: string;
          parent_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "research_interests_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "research_interests";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          category: string;
          created_at: string;
          id: number;
          name: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: never;
          name: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: never;
          name?: string;
        };
        Relationships: [];
      };
      student_profiles: {
        Row: {
          availability: Database["public"]["Enums"]["profile_availability"];
          bio: string | null;
          degree_type: string | null;
          department: string | null;
          display_name: string;
          experience_level: Database["public"]["Enums"]["profile_experience_level"];
          lab_experience: boolean;
          linkedin_url: string | null;
          orcid_url: string | null;
          preferred_collaboration_type: Database["public"]["Enums"]["collaboration_type"][];
          updated_at: string;
          user_id: string;
          website_url: string | null;
          year_level: string | null;
        };
        Insert: {
          availability?: Database["public"]["Enums"]["profile_availability"];
          bio?: string | null;
          degree_type?: string | null;
          department?: string | null;
          display_name: string;
          experience_level?: Database["public"]["Enums"]["profile_experience_level"];
          lab_experience?: boolean;
          linkedin_url?: string | null;
          orcid_url?: string | null;
          preferred_collaboration_type?: Database["public"]["Enums"]["collaboration_type"][];
          updated_at?: string;
          user_id: string;
          website_url?: string | null;
          year_level?: string | null;
        };
        Update: {
          availability?: Database["public"]["Enums"]["profile_availability"];
          bio?: string | null;
          degree_type?: string | null;
          department?: string | null;
          display_name?: string;
          experience_level?: Database["public"]["Enums"]["profile_experience_level"];
          lab_experience?: boolean;
          linkedin_url?: string | null;
          orcid_url?: string | null;
          preferred_collaboration_type?: Database["public"]["Enums"]["collaboration_type"][];
          updated_at?: string;
          user_id?: string;
          website_url?: string | null;
          year_level?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      collaboration_type: "research_assistant" | "co_author" | "project_lead";
      faculty_sought_experience_level: "any" | "beginner" | "intermediate" | "advanced";
      profile_availability: "actively_looking" | "open" | "not_available";
      profile_experience_level: "beginner" | "intermediate" | "advanced";
      profile_role: "student" | "faculty" | "researcher" | "coordinator" | "unverified";
      profile_skill_proficiency: "beginner" | "intermediate" | "advanced" | "expert";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
