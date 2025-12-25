# Quick Reference - SQL Queries for Smart Library

## 📚 Book Operations

### Add a New Book
```sql
-- Insert book
INSERT INTO books (title, category_id, publication_year, isbn, publisher)
VALUES ('1984', 1, 1949, '9780451524935', 'Signet Classic');

-- Link to author
INSERT INTO book_author (book_id, author_id)
VALUES (CURRVAL('books_book_id_seq'), 6); -- George Orwell's author_id

-- Add physical copies
INSERT INTO book_copies (book_id, condition, location)
VALUES 
  (CURRVAL('books_book_id_seq'), 'Good', 'A-505'),
  (CURRVAL('books_book_id_seq'), 'Excellent', 'A-506');
```

### Search Books
```sql
-- Search by title
SELECT * FROM available_books_view 
WHERE title ILIKE '%harry%';

-- Search by author
SELECT b.*, a.name AS author
FROM books b
JOIN book_author ba ON b.book_id = ba.book_id
JOIN authors a ON ba.author_id = a.author_id
WHERE a.name ILIKE '%king%';

-- Search by category
SELECT * FROM available_books_view 
WHERE category = 'Fiction';
```

## 👥 Member Operations

### Register New Member
```sql
-- With automatic 1-year expiry
INSERT INTO members (name, email, phone, address)
VALUES ('Jane Doe', 'jane@email.com', '555-1234', '123 Library St');

-- With custom expiry date
INSERT INTO members (name, email, phone, address, membership_expiry_date)
VALUES ('John Doe', 'john@email.com', '555-5678', '456 Main Ave', '2025-12-31');
```

### Check Expired Memberships
```sql
SELECT * FROM members 
WHERE membership_expiry_date < CURRENT_DATE 
ORDER BY membership_expiry_date;
```

### Renew Membership
```sql
UPDATE members 
SET membership_expiry_date = membership_expiry_date + INTERVAL '1 year',
    membership_status = 'Active'
WHERE member_id = 5;
```

### Check Member Status
```sql
SELECT 
  m.*,
  COUNT(bt.borrow_id) AS active_borrows,
  COALESCE(SUM(f.amount) FILTER (WHERE f.status = 'Unpaid'), 0) AS unpaid_fines
FROM members m
LEFT JOIN borrow_transactions bt ON m.member_id = bt.member_id AND bt.status = 'Active'
LEFT JOIN fines f ON m.member_id = f.member_id
WHERE m.email = 'jane@email.com'
GROUP BY m.member_id;
```

## 📖 Borrow/Return Operations

### Borrow a Book
```sql
-- Check if copy is available
SELECT copy_id, status FROM book_copies 
WHERE book_id = 1 AND status = 'Available' 
LIMIT 1;

-- Create borrow transaction
INSERT INTO borrow_transactions (member_id, copy_id, librarian_id, due_date)
VALUES (1, 5, 2, CURRENT_DATE + INTERVAL '14 days');
```

### Return a Book
```sql
-- Find active borrow
SELECT borrow_id FROM borrow_transactions 
WHERE copy_id = 5 AND status = 'Active';

-- Process return
INSERT INTO return_transactions (borrow_id, librarian_id, condition_on_return)
VALUES (10, 2, 'Good');
```

### Check Active Borrows
```sql
-- All active borrows
SELECT * FROM active_borrows_view 
ORDER BY due_date;

-- Overdue borrows
SELECT * FROM active_borrows_view 
WHERE borrow_status = 'Overdue'
ORDER BY days_overdue DESC;
```

## 💰 Fine Operations

### Check Member Fines
```sql
SELECT * FROM member_fines_view 
WHERE unpaid_amount > 0;
```

### Record Payment
```sql
INSERT INTO payments (fine_id, amount, payment_method, received_by)
VALUES (5, 10.00, 'Cash', 2);
```

### Waive Fine
```sql
UPDATE fines 
SET status = 'Waived' 
WHERE fine_id = 5;
```

## 📊 Reports

### Most Popular Books
```sql
SELECT 
  b.title,
  COUNT(bt.borrow_id) AS borrow_count
FROM books b
JOIN book_copies bc ON b.book_id = bc.book_id
JOIN borrow_transactions bt ON bc.copy_id = bt.copy_id
GROUP BY b.book_id, b.title
ORDER BY borrow_count DESC
LIMIT 10;
```

### Revenue Report
```sql
SELECT 
  DATE_TRUNC('month', payment_date) AS month,
  SUM(amount) AS total_revenue
FROM payments
GROUP BY month
ORDER BY month DESC;
```

### Member Activity
```sql
SELECT 
  m.name,
  COUNT(bt.borrow_id) AS total_borrows,
  MAX(bt.borrow_date) AS last_borrow
FROM members m
JOIN borrow_transactions bt ON m.member_id = bt.member_id
GROUP BY m.member_id, m.name
ORDER BY total_borrows DESC;
```

## 🔧 Maintenance

### Update Book Copy Status
```sql
UPDATE book_copies 
SET status = 'Maintenance', condition = 'Fair'
WHERE copy_id = 10;
```

### Suspend Member
```sql
UPDATE members 
SET membership_status = 'Suspended'
WHERE member_id = 5;
```

### Check System Health
```sql
SELECT 
  'Total Books' AS metric, COUNT(*)::TEXT AS value FROM books
UNION ALL
SELECT 'Total Copies', COUNT(*)::TEXT FROM book_copies
UNION ALL
SELECT 'Available Copies', COUNT(*)::TEXT FROM book_copies WHERE status = 'Available'
UNION ALL
SELECT 'Active Borrows', COUNT(*)::TEXT FROM borrow_transactions WHERE status = 'Active'
UNION ALL
SELECT 'Total Members', COUNT(*)::TEXT FROM members
UNION ALL
SELECT 'Unpaid Fines', SUM(amount)::TEXT FROM fines WHERE status = 'Unpaid';
```
