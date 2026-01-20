// =====================================================
// SUPABASE DATABASE TYPES
// =====================================================
// Auto-generated TypeScript types for your database schema
// Use these types with Supabase client for type safety

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
      audit_log: {
        Row: {
          audit_id: number
          user_id: number | null
          action: string
          table_name: string
          record_id: number | null
          old_values: Json | null
          new_values: Json | null
          timestamp: string
        }
        Insert: {
          audit_id?: number
          user_id?: number | null
          action: string
          table_name: string
          record_id?: number | null
          old_values?: Json | null
          new_values?: Json | null
          timestamp?: string
        }
        Update: {
          audit_id?: number
          user_id?: number | null
          action?: string
          table_name?: string
          record_id?: number | null
          old_values?: Json | null
          new_values?: Json | null
          timestamp?: string
        }
      }
      authors: {
        Row: {
          author_id: number
          name: string
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          author_id?: number
          name: string
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          author_id?: number
          name?: string
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      book_author: {
        Row: {
          isbn: string
          author_id: number
        }
        Insert: {
          isbn: string
          author_id: number
        }
        Update: {
          isbn?: string
          author_id?: number
        }
      }
      book_copies: {
        Row: {
          copy_id: number
          isbn: string
          status: 'Available' | 'Borrowed' | 'Lost'
          created_at: string
          updated_at: string
        }
        Insert: {
          copy_id?: number
          isbn: string
          status?: 'Available' | 'Borrowed' | 'Lost'
          created_at?: string
          updated_at?: string
        }
        Update: {
          copy_id?: number
          isbn?: string
          status?: 'Available' | 'Borrowed' | 'Lost'
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          isbn: string
          title: string
          category_id: number | null
          publication_year: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          isbn: string
          title: string
          category_id?: number | null
          publication_year?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          isbn?: string
          title?: string
          category_id?: number | null
          publication_year?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      borrow_transactions: {
        Row: {
          borrow_id: number
          member_id: number
          copy_id: number
          librarian_id: number | null
          borrow_date: string
          due_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          borrow_id?: number
          member_id: number
          copy_id: number
          librarian_id?: number | null
          borrow_date?: string
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          borrow_id?: number
          member_id?: number
          copy_id?: number
          librarian_id?: number | null
          borrow_date?: string
          due_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          category_id: number
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          category_id?: number
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: number
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      fines: {
        Row: {
          fine_id: number
          borrow_id: number | null
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          fine_id?: number
          borrow_id?: number | null
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          fine_id?: number
          borrow_id?: number | null
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          member_id: number
          name: string
          email: string
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          member_id?: number
          name: string
          email: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          member_id?: number
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          payment_id: number
          fine_id: number
          payment_date: string
          received_by: number | null
          created_at: string
        }
        Insert: {
          payment_id?: number
          fine_id: number
          payment_date?: string
          received_by?: number | null
          created_at?: string
        }
        Update: {
          payment_id?: number
          fine_id?: number
          payment_date?: string
          received_by?: number | null
          created_at?: string
        }
      }
      return_transactions: {
        Row: {
          return_id: number
          borrow_id: number
          librarian_id: number | null
          return_date: string
          created_at: string
        }
        Insert: {
          return_id?: number
          borrow_id: number
          librarian_id?: number | null
          return_date?: string
          created_at?: string
        }
        Update: {
          return_id?: number
          borrow_id?: number
          librarian_id?: number | null
          return_date?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          user_id: number
          username: string
          email: string
          password_hash: string
          role: 'Admin' | 'Librarian'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: number
          username: string
          email: string
          password_hash: string
          role: 'Admin' | 'Librarian'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: number
          username?: string
          email?: string
          password_hash?: string
          role?: 'Admin' | 'Librarian'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      available_books_view: {
        Row: {
          isbn: string
          title: string
          publication_year: number | null
          category: string | null
          authors: string | null
          available_copies: number | null
          total_copies: number | null
        }
      }
      active_borrows_view: {
        Row: {
          borrow_id: number
          member_id: number
          member_name: string
          member_email: string
          book_title: string
          copy_id: number
          borrow_date: string
          due_date: string
          borrow_status: string
          days_overdue: number
          librarian: string | null
          is_returned: boolean
        }
      }
      member_fines_view: {
        Row: {
          member_id: number
          member_name: string
          email: string
          total_fines: number | null
          total_fine_amount: number | null
        }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
  }
}

// Type helpers for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific type exports for convenience
export type Author = Tables<'authors'>
export type Book = Tables<'books'>
export type BookCopy = Tables<'book_copies'>
export type BorrowTransaction = Tables<'borrow_transactions'>
export type Category = Tables<'categories'>
export type Fine = Tables<'fines'>
export type Member = Tables<'members'>
export type Payment = Tables<'payments'>
export type ReturnTransaction = Tables<'return_transactions'>
export type User = Tables<'users'>
export type AuditLog = Tables<'audit_log'>

// View types
export type AvailableBook = Database['public']['Views']['available_books_view']['Row']
export type ActiveBorrow = Database['public']['Views']['active_borrows_view']['Row']
export type MemberFine = Database['public']['Views']['member_fines_view']['Row']
