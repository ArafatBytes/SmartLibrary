// Type definitions for analytics and database operations

export interface BookCopy {
  copy_id: number
  status: 'Available' | 'Borrowed' | 'Lost'
  isbn: string
  borrow_transactions?: { borrow_id: number }[]
}

export interface Book {
  isbn: string
  title: string
  publication_year: number
  description?: string
  cover_image_url?: string
  book_copies?: BookCopy[]
  categories?: { name: string }
  book_author?: { authors?: { name: string } }[]
}

export interface Fine {
  fine_id: number
  borrow_id: number
  amount: string
  fine_date: string
}

export interface Payment {
  payment_id: number
  fine_id: number
  payment_date: string
  received_by: number
  fines?: Fine
}

export interface BorrowTransaction {
  borrow_id: number
  member_id: number
  copy_id: number
  borrow_date: string
  due_date: string
  librarian_id: number
  members?: {
    member_id: number
    name: string
    email: string
  }
  book_copies?: {
    copy_id: number
    isbn: string
    books?: {
      isbn: string
      title: string
      categories?: { name: string }
    }
  }
  return_transactions?: { return_id: number }[]
}

export interface ReturnTransaction {
  return_id: number
  borrow_id: number
  return_date: string
  librarian_id: number
}

export interface Member {
  member_id: number
  name: string
  email: string
  phone?: string
  address?: string
}

export interface User {
  user_id: number
  username: string
  email: string
  role: 'Admin' | 'Librarian'
  borrow_transactions?: { borrow_id: number }[]
  return_transactions?: { return_id: number }[]
  payments?: { payment_id: number }[]
}

export interface BookCount {
  isbn: string
  title: string
  category: string
  borrow_count: number
}

export interface MemberCount {
  member_id: number
  name: string
  email: string
  total_borrows: number
}

export interface MonthlyData {
  [month: string]: number
}

export interface CategoryCount {
  [category: string]: number
}
