-- =====================================================
-- SMART LIBRARY - SAMPLE DATA
-- =====================================================
-- ⚠️ IMPORTANT: Run this SQL file in Supabase SQL Editor
-- This will populate your database with test users and sample data
--
-- LOGIN CREDENTIALS:
-- Username: admin      | Password: password123
-- Username: librarian1 | Password: password123
-- Username: librarian2 | Password: password123
-- =====================================================

-- =====================================================
-- CLEAR EXISTING SAMPLE DATA (for clean re-runs)
-- =====================================================
TRUNCATE TABLE payments, fines, return_transactions, borrow_transactions, 
             book_copies, book_author, books, authors, categories, 
             members, users, audit_log RESTART IDENTITY CASCADE;

-- =====================================================
-- SAMPLE CATEGORIES
-- =====================================================
INSERT INTO categories (name) VALUES
    ('Fiction'),
    ('Non-Fiction'),
    ('Science Fiction'),
    ('Mystery'),
    ('Biography'),
    ('History'),
    ('Technology'),
    ('Children'),
    ('Romance'),
    ('Thriller');

-- =====================================================
-- SAMPLE AUTHORS
-- =====================================================
INSERT INTO authors (name, bio) VALUES
    ('J.K. Rowling', 'British author, best known for Harry Potter series'),
    ('George R.R. Martin', 'American novelist and screenwriter'),
    ('Agatha Christie', 'English writer known for mystery novels'),
    ('Stephen King', 'American author of horror and suspense fiction'),
    ('Isaac Asimov', 'American science fiction writer'),
    ('Margaret Atwood', 'Canadian poet, novelist, and literary critic'),
    ('Dan Brown', 'American author best known for The Da Vinci Code'),
    ('Malcolm Gladwell', 'Canadian journalist and author'),
    ('Yuval Noah Harari', 'Israeli historian and author'),
    ('Michelle Obama', 'Former First Lady and author'),
    ('J.R.R. Tolkien', 'English writer and philologist'),
    ('Jane Austen', 'English novelist'),
    ('Ernest Hemingway', 'American novelist and journalist'),
    ('F. Scott Fitzgerald', 'American novelist'),
    ('Gabriel Garcia Marquez', 'Colombian novelist'),
    ('Toni Morrison', 'American novelist'),
    ('Harper Lee', 'American novelist'),
    ('Ray Bradbury', 'American author and screenwriter'),
    ('Kurt Vonnegut', 'American writer'),
    ('Neil Gaiman', 'English author'),
    ('Gillian Flynn', 'American author'),
    ('Paulo Coelho', 'Brazilian lyricist and novelist'),
    ('Khaled Hosseini', 'Afghan-American novelist'),
    ('Suzanne Collins', 'American author'),
    ('John Green', 'American author'),
    ('Markus Zusak', 'Australian author'),
    ('Chimamanda Ngozi Adichie', 'Nigerian author'),
    ('Haruki Murakami', 'Japanese writer'),
    ('Arundhati Roy', 'Indian author'),
    ('Salman Rushdie', 'British-Indian novelist'),
    ('Orhan Pamuk', 'Turkish novelist'),
    ('Kazuo Ishiguro', 'British novelist'),
    ('Cormac McCarthy', 'American novelist'),
    ('Don DeLillo', 'American novelist'),
    ('Margaret Mitchell', 'American novelist'),
    ('Virginia Woolf', 'English writer'),
    ('James Joyce', 'Irish novelist'),
    ('Albert Camus', 'French philosopher and author'),
    ('Franz Kafka', 'Bohemian novelist'),
    ('Leo Tolstoy', 'Russian writer'),
    ('Fyodor Dostoevsky', 'Russian novelist'),
    ('Charles Dickens', 'English writer'),
    ('Mark Twain', 'American writer'),
    ('Herman Melville', 'American novelist'),
    ('Oscar Wilde', 'Irish poet and playwright'),
    ('Emily Bronte', 'English novelist'),
    ('Charlotte Bronte', 'English novelist'),
    ('Mary Shelley', 'English novelist'),
    ('Bram Stoker', 'Irish author'),
    ('Arthur Conan Doyle', 'British writer');

-- =====================================================
-- SAMPLE BOOKS (100 Books)
-- =====================================================
INSERT INTO books (isbn, title, category_id, publisher, publication_year) VALUES
    ('9780747532699', 'Harry Potter and the Philosopher''s Stone', 1, 'Bloomsbury Publishing', 1997),
    ('9780553103540', 'A Game of Thrones', 3, 'Bantam Books', 1996),
    ('9780062693662', 'Murder on the Orient Express', 4, 'HarperCollins', 1934),
    ('9780385121675', 'The Shining', 10, 'Doubleday', 1977),
    ('9780553293357', 'Foundation', 3, 'Gnome Press', 1951),
    ('9780385490818', 'The Handmaid''s Tale', 1, 'McClelland & Stewart', 1985),
    ('9780385504201', 'The Da Vinci Code', 4, 'Doubleday', 2003),
    ('9780316017923', 'Outliers', 2, 'Little, Brown and Company', 2008),
    ('9780062316097', 'Sapiens', 6, 'Harper', 2011),
    ('9781524763138', 'Becoming', 5, 'Crown Publishing', 2018),
    ('9780345339683', 'The Hobbit', 1, 'Houghton Mifflin', 1937),
    ('9780141439518', 'Pride and Prejudice', 9, 'Penguin Classics', 1813),
    ('9780684830490', 'The Old Man and the Sea', 1, 'Scribner', 1952),
    ('9780743273565', 'The Great Gatsby', 1, 'Scribner', 1925),
    ('9780060883287', 'One Hundred Years of Solitude', 1, 'Harper Perennial', 1967),
    ('9781400033416', 'Beloved', 1, 'Vintage', 1987),
    ('9780061120084', 'To Kill a Mockingbird', 1, 'HarperCollins', 1960),
    ('9781451673319', 'Fahrenheit 451', 3, 'Simon & Schuster', 1953),
    ('9780385333849', 'Slaughterhouse-Five', 3, 'Random House', 1969),
    ('9780062572110', 'American Gods', 1, 'William Morrow', 2001),
    ('9780307588371', 'Gone Girl', 4, 'Crown Publishing', 2012),
    ('9780062315007', 'The Alchemist', 1, 'HarperOne', 1988),
    ('9781594631931', 'The Kite Runner', 1, 'Riverhead Books', 2003),
    ('9780439023481', 'The Hunger Games', 3, 'Scholastic Press', 2008),
    ('9780525478812', 'The Fault in Our Stars', 9, 'Dutton Books', 2012),
    ('9780375831003', 'The Book Thief', 1, 'Alfred A. Knopf', 2005),
    ('9780307455925', 'Half of a Yellow Sun', 1, 'Anchor Books', 2006),
    ('9780679775430', '1Q84', 1, 'Vintage', 2009),
    ('9780812979657', 'The God of Small Things', 1, 'Random House', 1997),
    ('9780812976717', 'Midnight''s Children', 1, 'Random House', 1981),
    ('9780571333134', 'My Name is Red', 1, 'Faber & Faber', 1998),
    ('9780679722762', 'Never Let Me Go', 3, 'Vintage', 2005),
    ('9780679723202', 'The Road', 1, 'Vintage', 2006),
    ('9780140283297', 'White Noise', 1, 'Penguin Books', 1985),
    ('9780446675536', 'Gone with the Wind', 9, 'Grand Central Publishing', 1936),
    ('9780156907392', 'To the Lighthouse', 1, 'Harcourt', 1927),
    ('9780679732242', 'Ulysses', 1, 'Vintage', 1922),
    ('9780679720201', 'The Stranger', 1, 'Vintage', 1942),
    ('9780805210583', 'The Metamorphosis', 1, 'Bantam Classics', 1915),
    ('9780143039990', 'War and Peace', 6, 'Penguin Classics', 1869),
    ('9780140449136', 'Crime and Punishment', 4, 'Penguin Classics', 1866),
    ('9780141439600', 'Great Expectations', 1, 'Penguin Classics', 1861),
    ('9780486280615', 'Adventures of Huckleberry Finn', 1, 'Dover Publications', 1884),
    ('9780142437247', 'Moby-Dick', 1, 'Penguin Classics', 1851),
    ('9780141439846', 'The Picture of Dorian Gray', 1, 'Penguin Classics', 1890),
    ('9780141439556', 'Wuthering Heights', 9, 'Penguin Classics', 1847),
    ('9780141441146', 'Jane Eyre', 9, 'Penguin Classics', 1847),
    ('9780486282114', 'Frankenstein', 10, 'Dover Publications', 1818),
    ('9780486411095', 'Dracula', 10, 'Dover Publications', 1897),
    ('9780143105428', 'The Adventures of Sherlock Holmes', 4, 'Penguin Classics', 1892),
    ('9780747538493', 'Harry Potter and the Chamber of Secrets', 1, 'Bloomsbury Publishing', 1998),
    ('9780747542155', 'Harry Potter and the Prisoner of Azkaban', 1, 'Bloomsbury Publishing', 1999),
    ('9780747546245', 'Harry Potter and the Goblet of Fire', 1, 'Bloomsbury Publishing', 2000),
    ('9780747551003', 'Harry Potter and the Order of the Phoenix', 1, 'Bloomsbury Publishing', 2003),
    ('9780747581086', 'Harry Potter and the Half-Blood Prince', 1, 'Bloomsbury Publishing', 2005),
    ('9780545010221', 'Harry Potter and the Deathly Hallows', 1, 'Scholastic Press', 2007),
    ('9780345339706', 'The Lord of the Rings', 1, 'Houghton Mifflin', 1954),
    ('9780553382563', 'A Clash of Kings', 3, 'Bantam Books', 1998),
    ('9780553106633', 'A Storm of Swords', 3, 'Bantam Books', 2000),
    ('9780553801477', 'A Feast for Crows', 3, 'Bantam Books', 2005),
    ('9780553385953', 'A Dance with Dragons', 3, 'Bantam Books', 2011),
    ('9780553293371', 'I, Robot', 3, 'Gnome Press', 1950),
    ('9780553283686', 'Second Foundation', 3, 'Gnome Press', 1953),
    ('9780553293395', 'Foundation and Empire', 3, 'Gnome Press', 1952),
    ('9780385490467', 'Oryx and Crake', 3, 'Anchor Books', 2003),
    ('9780385721677', 'The Year of the Flood', 3, 'Anchor Books', 2009),
    ('9780385528771', 'Angels & Demons', 4, 'Anchor Books', 2000),
    ('9780307474278', 'The Lost Symbol', 4, 'Anchor Books', 2009),
    ('9780385537858', 'Inferno', 4, 'Anchor Books', 2013),
    ('9780385537865', 'Origin', 4, 'Anchor Books', 2017),
    ('9780316346627', 'The Tipping Point', 2, 'Little, Brown and Company', 2000),
    ('9780316017930', 'Blink', 2, 'Little, Brown and Company', 2005),
    ('9780316204378', 'David and Goliath', 2, 'Little, Brown and Company', 2013),
    ('9780062316110', 'Homo Deus', 6, 'Harper', 2015),
    ('9780062464347', '21 Lessons for the 21st Century', 2, 'Spiegel & Grau', 2018),
    ('9780439064873', 'Harry Potter Box Set', 8, 'Scholastic Press', 2001),
    ('9780439023498', 'Catching Fire', 3, 'Scholastic Press', 2009),
    ('9780439023511', 'Mockingjay', 3, 'Scholastic Press', 2010),
    ('9780142414934', 'Looking for Alaska', 9, 'Dutton Books', 2005),
    ('9780525425588', 'Paper Towns', 9, 'Dutton Books', 2008),
    ('9780525478817', 'Turtles All the Way Down', 9, 'Dutton Books', 2017),
    ('9780670813469', 'Red Mars', 3, 'Bantam Spectra', 1992),
    ('9780553573350', 'Green Mars', 3, 'Bantam Spectra', 1993),
    ('9780553573374', 'Blue Mars', 3, 'Bantam Spectra', 1996),
    ('9780316769174', 'The Catcher in the Rye', 1, 'Little, Brown and Company', 1951),
    ('9780140283293', 'Brave New World', 3, 'Harper Perennial', 1932),
    ('9780452284234', '1984', 3, 'Signet Classics', 1949),
    ('9780143124542', 'Animal Farm', 1, 'Penguin Books', 1945),
    ('9780316769488', 'The Bell Jar', 1, 'Harper Perennial', 1963),
    ('9780141182803', 'Of Mice and Men', 1, 'Penguin Books', 1937),
    ('9780143039433', 'The Grapes of Wrath', 6, 'Penguin Classics', 1939),
    ('9780553213690', 'A Tale of Two Cities', 6, 'Bantam Classics', 1859),
    ('9780486284729', 'The Call of the Wild', 1, 'Dover Publications', 1903),
    ('9780451524935', 'Lord of the Flies', 1, 'Penguin Books', 1954),
    ('9780618260300', 'The Silmarillion', 1, 'Houghton Mifflin', 1977),
    ('9780446310789', 'To Kill a Mockingbird (Special Edition)', 1, 'Grand Central Publishing', 1960);

-- =====================================================
-- LINK BOOKS TO AUTHORS
-- =====================================================
INSERT INTO book_author (isbn, author_id) VALUES
    ('9780747532699', 1), ('9780553103540', 2), ('9780062693662', 3), ('9780385121675', 4),
    ('9780553293357', 5), ('9780385490818', 6), ('9780385504201', 7), ('9780316017923', 8),
    ('9780062316097', 9), ('9781524763138', 10), ('9780345339683', 11), ('9780141439518', 12),
    ('9780684830490', 13), ('9780743273565', 14), ('9780060883287', 15), ('9781400033416', 16),
    ('9780061120084', 17), ('9781451673319', 18), ('9780385333849', 19), ('9780062572110', 20),
    ('9780307588371', 21), ('9780062315007', 22), ('9781594631931', 23), ('9780439023481', 24),
    ('9780525478812', 25), ('9780375831003', 26), ('9780307455925', 27), ('9780679775430', 28),
    ('9780812979657', 29), ('9780812976717', 30), ('9780571333134', 31), ('9780679722762', 32),
    ('9780679723202', 33), ('9780140283297', 34), ('9780446675536', 35), ('9780156907392', 36),
    ('9780679732242', 37), ('9780679720201', 38), ('9780805210583', 39), ('9780143039990', 40),
    ('9780140449136', 41), ('9780141439600', 42), ('9780486280615', 43), ('9780142437247', 44),
    ('9780141439846', 45), ('9780141439556', 46), ('9780141441146', 47), ('9780486282114', 48),
    ('9780486411095', 49), ('9780143105428', 50), ('9780747538493', 1), ('9780747542155', 1),
    ('9780747546245', 1), ('9780747551003', 1), ('9780747581086', 1), ('9780545010221', 1),
    ('9780345339706', 11), ('9780553382563', 2), ('9780553106633', 2), ('9780553801477', 2),
    ('9780553385953', 2), ('9780553293371', 5), ('9780553283686', 5), ('9780553293395', 5),
    ('9780385490467', 6), ('9780385721677', 6), ('9780385528771', 7), ('9780307474278', 7),
    ('9780385537858', 7), ('9780385537865', 7), ('9780316346627', 8), ('9780316017930', 8),
    ('9780316204378', 8), ('9780062316110', 9), ('9780062464347', 9), ('9780439064873', 1),
    ('9780439023498', 24), ('9780439023511', 24), ('9780142414934', 25), ('9780525425588', 25),
    ('9780525478817', 25), ('9780670813469', 32), ('9780553573350', 32), ('9780553573374', 32),
    ('9780316769174', 4), ('9780140283293', 13), ('9780452284234', 2), ('9780143124542', 2),
    ('9780316769488', 36), ('9780141182803', 13), ('9780143039433', 13), ('9780553213690', 42),
    ('9780486284729', 13), ('9780451524935', 2), ('9780618260300', 11), ('9780446310789', 17);

-- =====================================================
-- SAMPLE BOOK COPIES (2-3 copies per book)
-- =====================================================
INSERT INTO book_copies (isbn, status) VALUES
    -- First 20 books
    ('9780747532699', 'Available'), ('9780747532699', 'Available'), ('9780747532699', 'Borrowed'),
    ('9780553103540', 'Available'), ('9780553103540', 'Available'),
    ('9780062693662', 'Available'), ('9780062693662', 'Borrowed'),
    ('9780385121675', 'Available'), ('9780385121675', 'Available'), ('9780385121675', 'Borrowed'),
    ('9780553293357', 'Available'), ('9780553293357', 'Available'),
    ('9780385490818', 'Available'), ('9780385490818', 'Borrowed'),
    ('9780385504201', 'Available'), ('9780385504201', 'Available'), ('9780385504201', 'Available'),
    ('9780316017923', 'Available'), ('9780316017923', 'Available'),
    ('9780062316097', 'Available'), ('9780062316097', 'Borrowed'),
    ('9781524763138', 'Available'), ('9781524763138', 'Available'),
    ('9780345339683', 'Available'), ('9780345339683', 'Available'), ('9780345339683', 'Available'),
    ('9780141439518', 'Available'), ('9780141439518', 'Available'),
    ('9780684830490', 'Available'), ('9780684830490', 'Borrowed'),
    ('9780743273565', 'Available'), ('9780743273565', 'Available'),
    ('9780060883287', 'Available'), ('9780060883287', 'Available'),
    ('9781400033416', 'Available'), ('9781400033416', 'Borrowed'),
    ('9780061120084', 'Available'), ('9780061120084', 'Available'), ('9780061120084', 'Available'),
    ('9781451673319', 'Available'), ('9781451673319', 'Available'),
    ('9780385333849', 'Available'), ('9780385333849', 'Borrowed'),
    ('9780062572110', 'Available'), ('9780062572110', 'Available'),
    -- Books 21-40
    ('9780307588371', 'Available'), ('9780307588371', 'Available'),
    ('9780062315007', 'Available'), ('9780062315007', 'Available'), ('9780062315007', 'Borrowed'),
    ('9781594631931', 'Available'), ('9781594631931', 'Available'),
    ('9780439023481', 'Available'), ('9780439023481', 'Available'), ('9780439023481', 'Borrowed'),
    ('9780525478812', 'Available'), ('9780525478812', 'Available'),
    ('9780375831003', 'Available'), ('9780375831003', 'Available'),
    ('9780307455925', 'Available'), ('9780307455925', 'Borrowed'),
    ('9780679775430', 'Available'), ('9780679775430', 'Available'),
    ('9780812979657', 'Available'), ('9780812979657', 'Available'),
    ('9780812976717', 'Available'), ('9780812976717', 'Borrowed'),
    ('9780571333134', 'Available'), ('9780571333134', 'Available'),
    ('9780679722762', 'Available'), ('9780679722762', 'Available'),
    ('9780679723202', 'Available'), ('9780679723202', 'Borrowed'),
    ('9780140283297', 'Available'), ('9780140283297', 'Available'),
    ('9780446675536', 'Available'), ('9780446675536', 'Available'), ('9780446675536', 'Borrowed'),
    ('9780156907392', 'Available'), ('9780156907392', 'Available'),
    ('9780679732242', 'Available'), ('9780679732242', 'Borrowed'),
    ('9780679720201', 'Available'), ('9780679720201', 'Available'),
    ('9780805210583', 'Available'), ('9780805210583', 'Available'),
    ('9780143039990', 'Available'), ('9780143039990', 'Borrowed'),
    -- Books 41-60
    ('9780140449136', 'Available'), ('9780140449136', 'Available'),
    ('9780141439600', 'Available'), ('9780141439600', 'Available'),
    ('9780486280615', 'Available'), ('9780486280615', 'Borrowed'),
    ('9780142437247', 'Available'), ('9780142437247', 'Available'),
    ('9780141439846', 'Available'), ('9780141439846', 'Available'),
    ('9780141439556', 'Available'), ('9780141439556', 'Borrowed'),
    ('9780141441146', 'Available'), ('9780141441146', 'Available'),
    ('9780486282114', 'Available'), ('9780486282114', 'Available'),
    ('9780486411095', 'Available'), ('9780486411095', 'Borrowed'),
    ('9780143105428', 'Available'), ('9780143105428', 'Available'),
    ('9780747538493', 'Available'), ('9780747538493', 'Available'), ('9780747538493', 'Borrowed'),
    ('9780747542155', 'Available'), ('9780747542155', 'Available'),
    ('9780747546245', 'Available'), ('9780747546245', 'Available'),
    ('9780747551003', 'Available'), ('9780747551003', 'Borrowed'),
    ('9780747581086', 'Available'), ('9780747581086', 'Available'),
    ('9780545010221', 'Available'), ('9780545010221', 'Available'), ('9780545010221', 'Borrowed'),
    ('9780345339706', 'Available'), ('9780345339706', 'Available'),
    ('9780553382563', 'Available'), ('9780553382563', 'Available'),
    ('9780553106633', 'Available'), ('9780553106633', 'Borrowed'),
    ('9780553801477', 'Available'), ('9780553801477', 'Available'),
    -- Books 61-80
    ('9780553385953', 'Available'), ('9780553385953', 'Available'),
    ('9780553293371', 'Available'), ('9780553293371', 'Borrowed'),
    ('9780553283686', 'Available'), ('9780553283686', 'Available'),
    ('9780553293395', 'Available'), ('9780553293395', 'Available'),
    ('9780385490467', 'Available'), ('9780385490467', 'Borrowed'),
    ('9780385721677', 'Available'), ('9780385721677', 'Available'),
    ('9780385528771', 'Available'), ('9780385528771', 'Available'),
    ('9780307474278', 'Available'), ('9780307474278', 'Borrowed'),
    ('9780385537858', 'Available'), ('9780385537858', 'Available'),
    ('9780385537865', 'Available'), ('9780385537865', 'Available'),
    ('9780316346627', 'Available'), ('9780316346627', 'Borrowed'),
    ('9780316017930', 'Available'), ('9780316017930', 'Available'),
    ('9780316204378', 'Available'), ('9780316204378', 'Available'),
    ('9780062316110', 'Available'), ('9780062316110', 'Borrowed'),
    ('9780062464347', 'Available'), ('9780062464347', 'Available'),
    ('9780439064873', 'Available'), ('9780439064873', 'Available'),
    ('9780439023498', 'Available'), ('9780439023498', 'Borrowed'),
    ('9780439023511', 'Available'), ('9780439023511', 'Available'),
    ('9780142414934', 'Available'), ('9780142414934', 'Available'),
    ('9780525425588', 'Available'), ('9780525425588', 'Borrowed'),
    -- Books 81-100
    ('9780525478817', 'Available'), ('9780525478817', 'Available'),
    ('9780670813469', 'Available'), ('9780670813469', 'Available'),
    ('9780553573350', 'Available'), ('9780553573350', 'Borrowed'),
    ('9780553573374', 'Available'), ('9780553573374', 'Available'),
    ('9780316769174', 'Available'), ('9780316769174', 'Available'),
    ('9780140283293', 'Available'), ('9780140283293', 'Borrowed'),
    ('9780452284234', 'Available'), ('9780452284234', 'Available'),
    ('9780143124542', 'Available'), ('9780143124542', 'Available'),
    ('9780316769488', 'Available'), ('9780316769488', 'Borrowed'),
    ('9780141182803', 'Available'), ('9780141182803', 'Available'),
    ('9780143039433', 'Available'), ('9780143039433', 'Available'),
    ('9780553213690', 'Available'), ('9780553213690', 'Borrowed'),
    ('9780486284729', 'Available'), ('9780486284729', 'Available'),
    ('9780451524935', 'Available'), ('9780451524935', 'Available'),
    ('9780618260300', 'Available'), ('9780618260300', 'Borrowed'),
    ('9780446310789', 'Available'), ('9780446310789', 'Available');

-- =====================================================
-- SAMPLE USERS (Admin and Librarians)
-- =====================================================
-- 🔑 All users have the same password: password123
-- 🔒 Hash: $2b$10$EmAii0C9U27Dr.h06jzjLu/PdjT7dr6bx533FSIM1rYabdO3ZayIy
-- ✅ VERIFIED with bcrypt.compare() - This hash is CORRECT!
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin', 'admin@smartlibrary.com', '$2b$10$EmAii0C9U27Dr.h06jzjLu/PdjT7dr6bx533FSIM1rYabdO3ZayIy', 'Admin'),
    ('librarian1', 'librarian1@smartlibrary.com', '$2b$10$EmAii0C9U27Dr.h06jzjLu/PdjT7dr6bx533FSIM1rYabdO3ZayIy', 'Librarian'),
    ('librarian2', 'librarian2@smartlibrary.com', '$2b$10$EmAii0C9U27Dr.h06jzjLu/PdjT7dr6bx533FSIM1rYabdO3ZayIy', 'Librarian');

-- =====================================================
-- SAMPLE MEMBERS
-- =====================================================
INSERT INTO members (name, email, phone, address) VALUES
    ('John Smith', 'john.smith@email.com', '555-0101', '123 Main St, City'),
    ('Sarah Johnson', 'sarah.j@email.com', '555-0102', '456 Oak Ave, City'),
    ('Michael Brown', 'mbrown@email.com', '555-0103', '789 Pine Rd, City'),
    ('Emily Davis', 'emily.d@email.com', '555-0104', '321 Elm St, City'),
    ('David Wilson', 'dwilson@email.com', '555-0105', '654 Maple Dr, City');

-- =====================================================
-- SAMPLE BORROW TRANSACTIONS
-- =====================================================
INSERT INTO borrow_transactions (member_id, copy_id, librarian_id, borrow_date, due_date) VALUES
    (1, 3, 2, NOW() - INTERVAL '10 days', CURRENT_DATE + INTERVAL '4 days'),
    (2, 8, 2, NOW() - INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days'),
    (3, 15, 3, NOW() - INTERVAL '20 days', CURRENT_DATE - INTERVAL '6 days'),
    (4, 1, 2, NOW() - INTERVAL '30 days', CURRENT_DATE - INTERVAL '16 days'),
    (5, 4, 3, NOW() - INTERVAL '25 days', CURRENT_DATE - INTERVAL '11 days');

-- =====================================================
-- SAMPLE RETURN TRANSACTIONS
-- =====================================================
INSERT INTO return_transactions (borrow_id, librarian_id, return_date) VALUES
    (4, 2, NOW() - INTERVAL '2 days'),
    (5, 3, NOW() - INTERVAL '1 day');

-- =====================================================
-- SAMPLE FINES
-- =====================================================
INSERT INTO fines (borrow_id, amount) VALUES
    (3, 6.00),
    (5, 11.00);

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify data)
-- =====================================================

-- Check users were created
SELECT user_id, username, email, role FROM users;

-- Check books were created
SELECT COUNT(*) as total_books FROM books;

-- Check members were created
SELECT COUNT(*) as total_members FROM members;

-- Check book copies
SELECT COUNT(*) as total_copies FROM book_copies;

-- =====================================================
-- CONFIRMATION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ✅ ✅ Sample data inserted successfully! ✅ ✅ ✅';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 LOGIN CREDENTIALS:';
    RAISE NOTICE '   Admin:      username=admin      password=password123';
    RAISE NOTICE '   Librarian1: username=librarian1 password=password123';
    RAISE NOTICE '   Librarian2: username=librarian2 password=password123';
    RAISE NOTICE '';
    RAISE NOTICE '📊 DATABASE SUMMARY:';
    RAISE NOTICE '   📚 Books: %', (SELECT COUNT(*) FROM books);
    RAISE NOTICE '   👥 Members: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE '   📖 Book Copies: %', (SELECT COUNT(*) FROM book_copies);
    RAISE NOTICE '   🔄 Borrow Transactions: %', (SELECT COUNT(*) FROM borrow_transactions);
    RAISE NOTICE '   👤 Users (Staff): %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Next Steps:';
    RAISE NOTICE '   1. Go to http://localhost:3000';
    RAISE NOTICE '   2. Login with credentials above';
    RAISE NOTICE '   3. Start testing the system!';
END $$;
