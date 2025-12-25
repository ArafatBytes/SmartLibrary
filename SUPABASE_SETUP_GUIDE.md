# 🚀 Smart Library - Supabase Database Setup Guide

This guide will walk you through setting up the complete library management system database in Supabase based on the provided ER diagram and schema.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Schema Overview](#database-schema-overview)
3. [Setup Instructions](#setup-instructions)
4. [Migration Files](#migration-files)
5. [Testing the Database](#testing-the-database)
6. [Common Queries](#common-queries)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

- Active Supabase account ([Create one here](https://supabase.com))
- Supabase project created
- Environment variables configured in `.env.local`

---

## 📊 Database Schema Overview

### Core Tables
- **categories**: Book categories (Fiction, Non-Fiction, etc.)
- **authors**: Author information
- **books**: Book catalog with metadata
- **book_author**: Many-to-many relationship between books and authors
- **book_copies**: Physical copies of books
- **members**: Library members
- **users**: System users (Admin, Librarian)

### Transaction Tables
- **borrow_transactions**: Borrowing records
- **return_transactions**: Return records
- **fines**: Fine records for overdue/damaged books
- **payments**: Payment records
- **audit_log**: System activity audit trail

### Key Relationships
```
books ─── has ──→ book_copies (1:M)
books ─── categorized as ──→ categories (M:1)
books ─── linked via ──→ book_author ──→ authors (M:M)
members ─── creates ──→ borrow_transactions (1:M)
borrow_transactions ─── borrowed in ──→ book_copies (M:1)
borrow_transactions ─── returned by ──→ return_transactions (1:1)
members ─── may incur ──→ fines (1:M)
fines ─── paid via ──→ payments (1:M)
users ─── processes/manages ──→ transactions (1:M)
```

---

## 🛠️ Setup Instructions

### Method 1: Using Supabase SQL Editor (Recommended)

#### Step 1: Access SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

#### Step 2: Run Migrations in Order

**Migration 1: Core Tables**
```sql
-- Copy and paste the entire content from:
-- supabase/migrations/20241204_001_core_tables.sql
```
- Click **Run** or press `Ctrl+Enter`
- Wait for success confirmation
- This creates: categories, authors, books, book_author, users, members

**Migration 2: Transaction Tables**
```sql
-- Copy and paste the entire content from:
-- supabase/migrations/20241204_002_transaction_tables.sql
```
- Click **Run**
- This creates: book_copies, borrow_transactions, return_transactions, fines, payments, audit_log
- Includes automatic triggers for status updates and overdue fines

**Migration 3: Security Policies**
```sql
-- Copy and paste the entire content from:
-- supabase/migrations/20241204_003_rls_policies.sql
```
- Click **Run**
- This enables Row Level Security (RLS) on all tables
- Creates helpful views for common queries

**Migration 4: Sample Data (Optional)**
```sql
-- Copy and paste the entire content from:
-- supabase/migrations/20241204_004_sample_data.sql
```
- Click **Run**
- This populates your database with test data

#### Step 3: Verify Installation
```sql
-- Check all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show: audit_log, authors, book_author, book_copies, books, 
-- borrow_transactions, categories, fines, members, payments, 
-- return_transactions, users
```

---

### Method 2: Using Supabase CLI

#### Step 1: Install Supabase CLI
```powershell
# Using npm
npm install -g supabase

# Or using scoop (Windows)
scoop install supabase
```

#### Step 2: Link to Your Project
```powershell
cd d:\smart_library
supabase login
supabase link --project-ref your-project-ref
```

#### Step 3: Push Migrations
```powershell
# Push all migrations to Supabase
supabase db push
```

---

## 📁 Migration Files

All migrations are located in `supabase/migrations/` directory:

| File | Description | Dependencies |
|------|-------------|--------------|
| `20241204_001_core_tables.sql` | Core tables (authors, books, categories, members, users) | None |
| `20241204_002_transaction_tables.sql` | Transaction tables with triggers | Migration 001 |
| `20241204_003_rls_policies.sql` | Row Level Security policies and views | Migrations 001, 002 |
| `20241204_004_sample_data.sql` | Test data (optional) | All previous |

---

## 🧪 Testing the Database

### Test 1: Check Available Books
```sql
SELECT * FROM available_books_view 
WHERE available_copies > 0 
ORDER BY title;
```

### Test 2: Check Active Borrows
```sql
SELECT * FROM active_borrows_view 
ORDER BY due_date;
```

### Test 3: Check Member Fines
```sql
SELECT * FROM member_fines_view 
WHERE unpaid_amount > 0;
```

### Test 4: Borrow a Book (Simulated)
```sql
-- Insert a new borrow transaction
INSERT INTO borrow_transactions (member_id, copy_id, librarian_id, due_date)
VALUES (1, 1, 2, CURRENT_DATE + INTERVAL '14 days');

-- Check that book_copy status changed to 'Borrowed'
SELECT * FROM book_copies WHERE copy_id = 1;
```

### Test 5: Return a Book (Simulated)
```sql
-- Return the borrowed book
INSERT INTO return_transactions (borrow_id, librarian_id, condition_on_return)
VALUES (1, 2, 'Good');

-- Check statuses updated
SELECT * FROM book_copies WHERE copy_id = 1;
SELECT * FROM borrow_transactions WHERE borrow_id = 1;
```

---

## 📖 Common Queries

### Find Books by Author
```sql
SELECT b.title, b.publication_year, a.name AS author
FROM books b
JOIN book_author ba ON b.book_id = ba.book_id
JOIN authors a ON ba.author_id = a.author_id
WHERE a.name ILIKE '%rowling%';
```

### Get Member Borrowing History
```sql
SELECT 
    m.name AS member,
    b.title AS book,
    bt.borrow_date,
    bt.due_date,
    bt.status
FROM borrow_transactions bt
JOIN members m ON bt.member_id = m.member_id
JOIN book_copies bc ON bt.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
WHERE m.member_id = 1
ORDER BY bt.borrow_date DESC;
```

### Find Overdue Books
```sql
SELECT 
    m.name AS member,
    m.email,
    b.title AS book,
    bt.due_date,
    CURRENT_DATE - bt.due_date AS days_overdue
FROM borrow_transactions bt
JOIN members m ON bt.member_id = m.member_id
JOIN book_copies bc ON bt.copy_id = bc.copy_id
JOIN books b ON bc.book_id = b.book_id
WHERE bt.status = 'Active' 
  AND bt.due_date < CURRENT_DATE
ORDER BY days_overdue DESC;
```

### Calculate Total Fines by Member
```sql
SELECT 
    m.name,
    m.email,
    SUM(f.amount) FILTER (WHERE f.status = 'Unpaid') AS unpaid_fines,
    SUM(f.amount) FILTER (WHERE f.status = 'Paid') AS paid_fines
FROM members m
LEFT JOIN fines f ON m.member_id = f.member_id
GROUP BY m.member_id, m.name, m.email
HAVING SUM(f.amount) FILTER (WHERE f.status = 'Unpaid') > 0;
```

### Most Popular Books
```sql
SELECT 
    b.title,
    COUNT(bt.borrow_id) AS times_borrowed
FROM books b
JOIN book_copies bc ON b.book_id = bc.book_id
JOIN borrow_transactions bt ON bc.copy_id = bt.copy_id
GROUP BY b.book_id, b.title
ORDER BY times_borrowed DESC
LIMIT 10;
```

---

## 🔒 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies based on user roles:

- **Public Access**: Categories, Authors, Books (read-only)
- **Staff Access**: Members, Transactions, Fines (Admin & Librarian)
- **Admin Only**: Users, Audit Logs

### Setting User Role in Your App
```typescript
// In your Next.js app, set the user role after authentication
import { createClient } from '@/lib/supabase/server'

export async function setUserRole(userId: number) {
  const supabase = await createClient()
  
  // Get user role from database
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', userId)
    .single()
  
  // Set role in session
  await supabase.rpc('set_config', {
    setting_name: 'app.user_role',
    setting_value: user.role
  })
}
```

---

## 🚨 Troubleshooting

### Issue: "relation already exists"
**Solution**: Tables already created. Drop them first or skip to next migration.

### Issue: Foreign key violations
**Solution**: Ensure migrations run in order (001 → 002 → 003 → 004).

### Issue: Trigger errors
**Solution**: Make sure `update_updated_at_column()` function exists from migration 001.

### Issue: RLS blocking queries
**Solution**: 
1. Ensure user role is set properly
2. Use service role key for admin operations
3. Check policy conditions match your use case

### Reset Database (Start Fresh)
```sql
-- WARNING: This deletes ALL data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run all migrations
```

---

## 📝 Next Steps

1. ✅ Run all migrations in Supabase
2. ✅ Test with sample data
3. 🔨 Build your Next.js frontend components
4. 🔗 Connect frontend to Supabase using provided client utilities
5. 🎨 Create admin dashboard for librarians
6. 📱 Build member portal for book browsing

---

## 🎯 Key Features Implemented

✅ **Automatic Triggers**:
- Book copy status updates on borrow/return
- Overdue fine calculation and creation
- Fine status updates on payment
- Timestamp management

✅ **Data Integrity**:
- Foreign key constraints
- Check constraints on status fields
- Unique constraints on emails, ISBN
- Cascade deletes where appropriate

✅ **Performance**:
- Indexes on frequently queried columns
- Materialized views for common queries
- Optimized relationship queries

✅ **Security**:
- Row Level Security enabled
- Role-based access control
- Audit logging for all actions

✅ **Complete ER Diagram Implementation**:
- All entities from schema
- All relationships with correct cardinality
- Junction tables for many-to-many relationships

---

## 📞 Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review migration files for SQL syntax
3. Check Supabase dashboard logs for errors
4. Verify environment variables are set correctly

---

**Happy Coding! 🚀📚**
