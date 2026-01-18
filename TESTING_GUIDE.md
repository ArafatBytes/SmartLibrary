# 🧪 Smart Library - Testing Guide

## ✅ Server is Running!

Your Next.js app is running at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.56.1:3000

---

## 📋 Before Testing - Database Setup

### 1. Run Database Migrations in Supabase

Go to your Supabase Dashboard: https://supabase.com/dashboard

1. Select your project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Run the migrations **IN ORDER**:

**Step 1: Core Tables**
```sql
-- Copy and paste content from: supabase/migrations/20241204_001_core_tables.sql
```

**Step 2: Transaction Tables**
```sql
-- Copy and paste content from: supabase/migrations/20241204_002_transaction_tables.sql
```

**Step 3: RLS Policies**
```sql
-- Copy and paste content from: supabase/migrations/20241204_003_rls_policies.sql
```

**Step 4: Sample Data (Optional but Recommended)**
```sql
-- Copy and paste content from: supabase/migrations/20241204_004_sample_data.sql
```

---

## 🧪 Testing Scenarios

### Test 1: Login as Admin

1. **Open**: http://localhost:3000
2. **You'll be redirected to**: http://localhost:3000/login
3. **Login with**:
   - Username: `admin`
   - Password: `password123`
4. **Expected**: Redirect to `/admin` dashboard
5. **You should see**: Two tabs - "Manage Librarians" and "Audit Log"

---

### Test 2: Admin - Manage Librarians

1. From admin dashboard, click **"Manage Librarians"** or go to `/admin/librarians`
2. **Test CREATE**:
   - Click "Add New Librarian"
   - Fill in:
     - Username: `librarian3`
     - Email: `librarian3@smartlibrary.com`
     - Phone: `555-0106`
     - Password: `password123`
   - Click "Create Librarian"
   - ✅ New librarian should appear in table

3. **Test READ**:
   - You should see a table with all librarians
   - Should show: ID, Username, Email, Phone, Created Date

4. **Test UPDATE**:
   - Click "Edit" on any librarian
   - Change phone number
   - Click "Update Librarian"
   - ✅ Changes should be reflected

5. **Test DELETE**:
   - Click "Delete" on a librarian
   - Confirm deletion
   - ✅ Librarian should be removed from table

---

### Test 3: Admin - Audit Log

1. From admin dashboard, click **"Audit Log"** or go to `/admin/audit-log`
2. **Expected**: Table showing audit log entries (if any exist)
3. Click "View" under Details to see old/new values in JSON format

---

### Test 4: Login as Librarian

1. **Logout** from admin (click Logout button)
2. **Go to**: http://localhost:3000/login
3. **Login with**:
   - Username: `librarian1`
   - Password: `password123`
4. **Expected**: Redirect to `/librarian` dashboard
5. **You should see**: 
   - Search bar at top
   - Two tabs: "Borrow Book" and "Return Book"

---

### Test 5: Librarian - Search Books

1. **Type in search bar**: "Harry Potter"
2. **Click "Search"**
3. **Expected**: Alert with search query (dummy functionality for now)

---

### Test 6: Librarian - Borrow Book

1. Click **"Borrow Book"** tab
2. **Fill in form**:
   - Book Copy ID: `1` (from sample data)
   - Member ID: `1` (from sample data)
   - Due Date: Select a future date (e.g., 14 days from now)
3. **Click "Create Borrow Transaction"**
4. **Expected**: 
   - ✅ Success message: "Book borrowed successfully!"
   - Form fields cleared
   - In database: `borrow_transactions` table has new entry
   - In database: `book_copies` status changed to "Borrowed"

**To verify in Supabase:**
```sql
-- Check borrow transaction
SELECT * FROM borrow_transactions ORDER BY borrow_date DESC LIMIT 5;

-- Check book copy status
SELECT copy_id, isbn, status FROM book_copies WHERE copy_id = 1;
```

---

### Test 7: Librarian - Return Book

1. Click **"Return Book"** tab
2. **Fill in form**:
   - Book Copy ID: `1` (the one you just borrowed)
3. **Click "Process Return"**
4. **Expected**:
   - ✅ Success message: "Book returned successfully!"
   - In database: `return_transactions` table has new entry
   - In database: `book_copies` status changed to "Available"
   - If overdue: A `fines` entry is automatically created

**To verify in Supabase:**
```sql
-- Check return transaction
SELECT * FROM return_transactions ORDER BY return_date DESC LIMIT 5;

-- Check if fine was created (if book was overdue)
SELECT * FROM fines ORDER BY created_at DESC LIMIT 5;

-- Check book copy status
SELECT copy_id, isbn, status FROM book_copies WHERE copy_id = 1;
```

---

### Test 8: Try Borrowing an Already Borrowed Book

1. Borrow a book (Copy ID: 2)
2. Try to borrow the same book again (Copy ID: 2)
3. **Expected**: Error message: "Book copy is not available"

---

### Test 9: Try Returning a Book Not Borrowed

1. Go to Return Book tab
2. Enter Copy ID: `99` (non-existent or not borrowed)
3. **Expected**: Error message: "No active borrow found for this copy ID"

---

## 🔍 Verify Sample Data

If you ran the sample data migration, you should have:

### Users
```sql
SELECT user_id, username, email, role FROM users;
```
- 1 Admin: `admin`
- 2+ Librarians: `librarian1`, `librarian2`

### Members
```sql
SELECT member_id, name, email FROM members;
```
- 5 members (John Smith, Sarah Johnson, etc.)

### Books
```sql
SELECT isbn, title FROM books;
```
- 10 books (Harry Potter, Game of Thrones, etc.)

### Book Copies
```sql
SELECT copy_id, isbn, status FROM book_copies;
```
- 16 book copies
- Some marked as "Available", some as "Borrowed"

---

## 🐛 Common Issues

### Issue 1: "relation does not exist"
**Solution**: Run the database migrations in Supabase SQL Editor

### Issue 2: Login fails
**Solution**: Make sure sample data is loaded, or create a user manually:
```sql
INSERT INTO users (username, email, password_hash, role) 
VALUES ('testadmin', 'test@example.com', 'password123', 'Admin');
```

### Issue 3: "Invalid username or password"
**Solution**: 
- Check that user exists in database
- Password should be `password123` (or what you set)
- Remember: Currently using plain text passwords (NOT secure for production)

### Issue 4: Port 3000 already in use
**Solution**: Kill the process or use a different port:
```bash
npm run dev -- -p 3001
```

---

## 🎯 Next Steps

1. **Test all CRUD operations** for librarians
2. **Test borrow and return workflows** with different scenarios
3. **Check database** after each operation to verify data integrity
4. **Try edge cases**: Invalid IDs, already borrowed books, etc.

---

## 📱 Access URLs

- **Home/Login**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Manage Librarians**: http://localhost:3000/admin/librarians
- **Audit Log**: http://localhost:3000/admin/audit-log
- **Librarian Dashboard**: http://localhost:3000/librarian
- **Test Supabase**: http://localhost:3000/test-supabase

---

## 🔐 Default Credentials (from sample data)

### Admin
- Username: `admin`
- Password: `password123`

### Librarians
- Username: `librarian1` / Password: `password123`
- Username: `librarian2` / Password: `password123`

---

**Happy Testing! 🚀**
