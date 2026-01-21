# API Quick Reference Guide

Complete API documentation for the Smart Library Management System.

## Authentication

### Login
- **URL**: `/api/auth/login`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Success**: Returns user session, sets cookie
- **Roles**: Admin, Librarian

### Logout
- **URL**: `/api/auth/logout`
- **Method**: POST
- **Success**: Clears session cookie

---

## Admin Operations

### Create Librarian
- **URL**: `/api/admin/librarian`
- **Method**: POST
- **Body**:
  ```json
  {
    "username": "john_doe",
    "email": "john@library.com",
    "password": "secure123"
  }
  ```

### Get All Librarians
- **URL**: `/api/admin/librarian`
- **Method**: GET
- **Returns**: Array of librarian objects

### Delete Librarian
- **URL**: `/api/admin/librarian?userId={id}`
- **Method**: DELETE
- **Returns**: Success message

### Get Audit Log
- **URL**: `/api/admin/audit`
- **Method**: GET
- **Returns**: Array of audit log entries with user info

### Get Analytics Reports ⭐ NEW
- **URL**: `/api/admin/analytics?type={report_type}`
- **Method**: GET
- **Report Types**:
  - `overview` - Dashboard statistics
  - `monthly-borrowing` - Monthly borrowing trends
  - `fines-collected` - Monthly fine collection
  - `top-borrowed-books` - Most popular books (add `&limit=10`)
  - `category-wise-borrows` - Borrows by category
  - `most-active-members` - Top borrowers (add `&limit=10`)
  - `book-availability` - Inventory status
  - `never-borrowed` - Unused books
  - `highest-overdue` - Members with most overdue days
  - `overdue-today` - Currently overdue books
  - `librarian-activity` - Staff performance metrics

---

## Member Management

### Create Member
- **URL**: `/api/members`
- **Method**: POST
- **Body**:
  ```json
  {
    "name": "John Smith",
    "email": "john@email.com",
    "phone": "555-1234",
    "address": "123 Main St"
  }
  ```

### Get All Members
- **URL**: `/api/members`
- **Method**: GET
- **Returns**: Array of member objects

---

## Book Operations

### Add Book
- **URL**: `/api/books`
- **Method**: POST
- **Body**:
  ```json
  {
    "isbn": "978-0-123456-78-9",
    "title": "Example Book",
    "publication_year": 2023,
    "description": "Book description",
    "cover_image_url": "https://...",
    "author_name": "John Author",
    "category_name": "Fiction",
    "publisher_name": "Publisher Inc"
  }
  ```

### Get All Books
- **URL**: `/api/books`
- **Method**: GET
- **Returns**: Array of books with author, category, publisher info

### Search Books ⭐ NEW
- **URL**: `/api/librarian/search?query={search_term}`
- **Method**: GET
- **Searches**: Title, ISBN, Description (case-insensitive)
- **Returns**: Books with availability info
  ```json
  [
    {
      "isbn": "978-0-123456-78-9",
      "title": "Example Book",
      "author": "John Author",
      "category": "Fiction",
      "available_copies": 3,
      "is_available": true
    }
  ]
  ```

### Add Book Copy
- **URL**: `/api/books/copies`
- **Method**: POST
- **Body**:
  ```json
  {
    "isbn": "978-0-123456-78-9",
    "status": "Available"
  }
  ```

### Get Book Copies
- **URL**: `/api/books/copies?isbn={isbn}`
- **Method**: GET
- **Returns**: Array of copies for the book

---

## Borrow/Return Operations

### Borrow Book ⭐ Enhanced
- **URL**: `/api/librarian/borrow`
- **Method**: POST
- **Body**:
  ```json
  {
    "member_id": 1,
    "copy_id": 123,
    "librarian_id": 5,
    "due_date": "2024-04-15"
  }
  ```
- **Features**: 
  - ✅ `due_date` is **optional** - defaults to **4 months** from borrow date
  - ✅ Validates book copy availability
  - ✅ Trigger automatically sets book_copy status to "Borrowed"
  - ✅ Logged to audit_log

### Return Book ⭐ Enhanced with Fine Enforcement
- **URL**: `/api/librarian/return`
- **Method**: POST
- **Body**:
  ```json
  {
    "borrow_id": 456,
    "librarian_id": 5
  }
  ```
- **Features**:
  - ✅ **Blocks return if unpaid fine exists**
  - ✅ Returns 400 error with fine details if payment required:
    ```json
    {
      "error": "Cannot return book with unpaid fine",
      "fine_id": 123,
      "fine_amount": 45.00,
      "message": "Member must pay $45.00 fine before returning"
    }
    ```
  - ✅ Trigger automatically sets book_copy status to "Available"
  - ✅ Trigger generates fine if overdue ($1/day)
  - ✅ Logged to audit_log

---

## Fine & Payment Operations ⭐ NEW

### Get Unpaid Fines for Member
- **URL**: `/api/librarian/payments?member_id={id}`
- **Method**: GET
- **Returns**: Array of unpaid fines with book details
  ```json
  [
    {
      "fine_id": 123,
      "borrow_id": 456,
      "amount": 45.00,
      "fine_date": "2024-01-15",
      "book_title": "Example Book",
      "member_name": "John Smith"
    }
  ]
  ```

### Record Fine Payment
- **URL**: `/api/librarian/payments`
- **Method**: POST
- **Body**:
  ```json
  {
    "fine_id": 123,
    "received_by": 5
  }
  ```
- **Features**: 
  - ✅ Prevents duplicate payments (one-to-one fine→payment)
  - ✅ Sets payment_date to current date
  - ✅ Logged to audit_log automatically

---

## Database Functions (Call via SQL or RPC)

### Manual Fine Calculation
```sql
SELECT calculate_overdue_fines();
```
- Calculates fines for all unreturned overdue books
- Runs weekly via cron job
- Updates existing fines instead of creating duplicates

### Get Active Borrows for Member
```sql
SELECT * FROM get_active_borrows(1);
```
- Returns unreturned books with days_until_due
- Shows is_overdue status

### Get Member Fine Summary
```sql
SELECT * FROM get_member_fine_summary(1);
```
- Returns: total_fines, paid_fines, unpaid_fines, total_amount, paid_amount, unpaid_amount

### Get Inventory Health
```sql
SELECT * FROM get_inventory_health();
```
- Returns: total_books, total_copies, available, borrowed, lost, utilization_rate

### Get Circulation Stats
```sql
SELECT * FROM get_circulation_stats('2024-01-01', '2024-12-31');
```
- Returns: total_borrows, total_returns, unique_borrowers, popular_category, avg_duration

---

## Common Workflows

### 1. Process Book Borrow
```bash
# Step 1: Search for book
GET /api/librarian/search?query=book_title

# Step 2: Borrow (4-month due date auto-calculated)
POST /api/librarian/borrow
{
  "member_id": 1,
  "copy_id": 123,
  "librarian_id": 5
}

# System automatically:
# - Sets due_date to 4 months from today
# - Updates copy status to "Borrowed" (trigger)
# - Logs to audit_log (trigger)
```

### 2. Process Book Return
```bash
# Step 1: Attempt return
POST /api/librarian/return
{
  "borrow_id": 456,
  "librarian_id": 5
}

# If unpaid fine exists:
# → Returns 400 error with fine details
# → Member cannot return until fine is paid

# If no fine or fine is paid:
# → System processes return
# → Updates copy status to "Available" (trigger)
# → Generates fine if overdue (trigger)
# → Logs to audit_log (trigger)
```

### 3. Process Fine Payment
```bash
# Step 1: Check unpaid fines
GET /api/librarian/payments?member_id=1

# Step 2: Record payment
POST /api/librarian/payments
{
  "fine_id": 123,
  "received_by": 5
}

# System automatically:
# - Creates payment record
# - Prevents duplicate payments
# - Logs to audit_log (trigger)

# Step 3: Now member can return the book
POST /api/librarian/return
{
  "borrow_id": 456,
  "librarian_id": 5
}
```

### 4. View Analytics
```bash
# Access admin analytics dashboard
GET /admin/analytics

# Or call API directly
GET /api/admin/analytics?type=overview
GET /api/admin/analytics?type=overdue-today
GET /api/admin/analytics?type=top-borrowed-books&limit=10
```

---

## Automated Processes

### Triggers (Automatic)
1. **On Borrow**: Set book_copy status to "Borrowed"
2. **On Return**: Set book_copy status to "Available"
3. **On Return (Overdue)**: Generate fine automatically
4. **On Any Change**: Log to audit_log (users, members, borrows, returns, fines, payments)

### Scheduled Jobs (Weekly)
1. **Fine Calculation**: Runs every Sunday 11 PM
   - Calculates fines for unreturned overdue books
   - Updates existing fines (no duplicates)
   - $1 per day overdue rate
   - See `CRON_SETUP_GUIDE.md` for setup

---

## Key Features

✅ **Automated Fine Calculation** - Weekly cron job  
✅ **4-Month Default Due Date** - Automatic calculation  
✅ **Payment Enforcement** - Blocks returns with unpaid fines  
✅ **One-to-One Relationships** - Prevents duplicate fines/payments  
✅ **Comprehensive Search** - Full-text across title/ISBN/description  
✅ **Analytics Dashboard** - 11 different report types  
✅ **Audit Logging** - Automatic tracking of all operations  
✅ **Inventory Automation** - Triggers manage book status  

---

## Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error, unpaid fine blocking return)
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error

---

For detailed implementation info, see `BACKEND_IMPLEMENTATION.md`  
For cron job setup, see `CRON_SETUP_GUIDE.md`
