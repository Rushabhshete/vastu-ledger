-- ============================================================
-- VastuLedger Seed Data (Multi-Tenant SaaS with SuperAdmin)
-- Password for all users: Vastu@2026 (bcrypt 10 rounds)
-- ============================================================

INSERT INTO societies (id, name, slug, registration_number, address, city, state, pincode, contact_email, contact_phone, status) VALUES
(1, 'Vastu Heights Co-operative Housing Society', 'vastu-heights', 'MAH/PUN/RWA/2026/411045', 'Plot 42, Baner Hill Trail, Baner', 'Pune', 'Maharashtra', '411045', 'admin@vastuledger.in', '+91 98765 43210', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO wings (id, society_id, name, code, total_floors, has_elevator) VALUES
(1, 1, 'Wing A (Lotus Tower)', 'A', 5, TRUE),
(2, 1, 'Wing B (Gulmohar Tower)', 'B', 5, TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO flats (id, society_id, wing_id, wing, floor, number, address, area_sqft, bhk, is_occupied, occupancy_type) VALUES
(1,  1, 1, 'A', 1, '101', 'Wing A, Vastu Heights, Baner, Pune 411045',  1200, '2BHK', TRUE,  'OWNER_OCCUPIED'),
(2,  1, 1, 'A', 2, '204', 'Wing A, Vastu Heights, Baner, Pune 411045',  1500, '3BHK', TRUE,  'OWNER_OCCUPIED'),
(3,  1, 2, 'B', 3, '302', 'Wing B, Vastu Heights, Baner, Pune 411045',   900, '1BHK', TRUE,  'OWNER_OCCUPIED'),
(4,  1, 2, 'B', 4, '401', 'Wing B, Vastu Heights, Baner, Pune 411045',  1300, '2BHK', TRUE,  'OWNER_OCCUPIED'),
(5,  1, 1, 'A', 1, '105', 'Wing A, Vastu Heights, Baner, Pune 411045',  1100, '2BHK', TRUE,  'OWNER_OCCUPIED'),
(6,  1, 1, 'A', 2, '210', 'Wing A, Vastu Heights, Baner, Pune 411045',  1600, '3BHK', FALSE, 'VACANT'),
(7,  1, 2, 'B', 3, '305', 'Wing B, Vastu Heights, Baner, Pune 411045',   950, '1BHK', TRUE,  'TENANT_OCCUPIED'),
(8,  1, 2, 'B', 4, '410', 'Wing B, Vastu Heights, Baner, Pune 411045',  1400, '2BHK', TRUE,  'OWNER_OCCUPIED'),
(9,  1, 1, 'A', 1, '108', 'Wing A, Vastu Heights, Baner, Pune 411045',  1150, '2BHK', TRUE,  'OWNER_OCCUPIED'),
(10, 1, 2, 'B', 4, '415', 'Wing B, Vastu Heights, Baner, Pune 411045',  1450, '3BHK', FALSE, 'VACANT')
ON DUPLICATE KEY UPDATE number=VALUES(number);

INSERT INTO users (id, email, password_hash, full_name, phone_encrypted, pan_encrypted, role, is_superadmin, flat_id) VALUES
(1,  'admin@vastuledger.in',      '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Arun Prasad',     NULL, NULL, 'ADMIN',     FALSE, NULL),
(2,  'treasurer@vastuledger.in',  '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Deepa Sharma',    NULL, NULL, 'TREASURER', FALSE, NULL),
(3,  'committee1@vastuledger.in', '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Sanjay Joshi',    NULL, NULL, 'COMMITTEE', FALSE, NULL),
(4,  'committee2@vastuledger.in', '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Meera Patel',     NULL, NULL, 'COMMITTEE', FALSE, NULL),
(5,  'rajesh@vastuledger.in',     '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Rajesh Kulkarni', NULL, NULL, 'RESIDENT',  FALSE, 1),
(6,  'priya@vastuledger.in',      '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Priya Deshmukh',  NULL, NULL, 'RESIDENT',  FALSE, 2),
(7,  'amitabh@vastuledger.in',    '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Amitabh Joshi',   NULL, NULL, 'RESIDENT',  FALSE, 3),
(8,  'sneha@vastuledger.in',      '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Sneha Nair',      NULL, NULL, 'RESIDENT',  FALSE, 4),
(9,  'vikram@vastuledger.in',     '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Vikram Singh',    NULL, NULL, 'RESIDENT',  FALSE, 5),
(10, 'anita@vastuledger.in',      '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Anita Rao',       NULL, NULL, 'RESIDENT',  FALSE, 6),
(11, 'superadmin@vastuledger.in', '$2a$10$V.mCQM.uY3nWhINETxZbCuu0f6W1L9cC3q87I428OFFN6LIFI3u1y', 'Platform SuperAdmin', NULL, NULL, 'ADMIN', TRUE,  NULL)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

INSERT INTO society_memberships (society_id, user_id, role, flat_id) VALUES
(1, 1,  'ADMIN',     NULL),
(1, 2,  'TREASURER', NULL),
(1, 3,  'COMMITTEE', NULL),
(1, 4,  'COMMITTEE', NULL),
(1, 5,  'RESIDENT',  1),
(1, 6,  'RESIDENT',  2),
(1, 7,  'RESIDENT',  3),
(1, 8,  'RESIDENT',  4),
(1, 9,  'RESIDENT',  5),
(1, 10, 'RESIDENT',  6)
ON DUPLICATE KEY UPDATE role=VALUES(role);

INSERT INTO system_settings (society_id, setting_key, setting_value) VALUES
(1, 'MAINTENANCE_MODE',               'FLAT_SQFT'),
(1, 'MAINTENANCE_RATE_SQFT',          '5.50'),
(1, 'FIXED_1BHK',                     '2500'),
(1, 'FIXED_2BHK',                     '3500'),
(1, 'FIXED_3BHK',                     '5000'),
(1, 'SINKING_FUND_PCT',               '10'),
(1, 'REPAIR_FUND_PCT',                '5'),
(1, 'NON_OCCUPANCY_CHARGE_PCT',       '10'),
(1, 'LATE_FEE_GRACE_DAYS',            '10'),
(1, 'LATE_FEE_TYPE',                  'SIMPLE_PERCENT'),
(1, 'LATE_FEE_RATE',                  '18'),
(1, 'MAKER_CHECKER_THRESHOLD',        '15000'),
(1, 'SOCIETY_UPI_VPA',                'vastuheights@icici'),
(1, 'SOCIETY_BANK_MASK',              'ICICI ****4521'),
(1, 'SOCIETY_GSTIN',                  '27AABCV1234F1ZK'),
(1, 'BILLING_CYCLE_DAY',              '1'),
(1, 'FEATURE_3D_TOWER_VIEW',          'true'),
(1, 'FEATURE_RESIDENT_UPI_SELF_REPORT','true'),
(1, 'FEATURE_PUBLIC_VENDOR_RECEIPTS', 'true')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);


-- Initial Ledger Transactions with Verified Cryptographic SHA-256 Hash Chain
INSERT INTO ledger_transactions (id, society_id, transaction_type, category, reference_type, reference_id, description, amount, balance_after, prev_hash, row_hash, created_by, created_at) VALUES
(1, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 1, 'Maintenance Jan-26 Flat A-101', 7590.00, 7590.00, '0000000000000000000000000000000000000000000000000000000000000000', '48b7168cb7520d305d314cde06fc0424020b0b82311cfba5fae06e094b26ef0f', 2, '2026-01-05 05:00:00'),
(2, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 2, 'Maintenance Jan-26 Flat A-204', 9487.50, 17077.50, '48b7168cb7520d305d314cde06fc0424020b0b82311cfba5fae06e094b26ef0f', 'eb31246c5989adfe35596074019c804d0c728e0ffef2d2f31051cd6115d146ad', 2, '2026-01-06 08:45:00'),
(3, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 3, 'Maintenance Jan-26 Flat B-302', 5692.50, 22770.00, 'eb31246c5989adfe35596074019c804d0c728e0ffef2d2f31051cd6115d146ad', '7d49382e6964ac9ddd664a1c6a6638100493b1d42b167a516f8d418f87d0c316', 2, '2026-01-07 04:15:00'),
(4, 1, 'DEBIT', 'VENDOR_EXPENSE', 'vendor_expense', 1, 'Otis Elevator AMC Jan-26', 24500.00, -1730.00, '7d49382e6964ac9ddd664a1c6a6638100493b1d42b167a516f8d418f87d0c316', 'fa5eec2eeffa71d034bf6e93f8633cfcbae8c484c983d579453b12a13546183c', 2, '2026-01-15 06:30:00'),
(5, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 4, 'Maintenance Jan-26 Flat B-401', 8222.50, 6492.50, 'fa5eec2eeffa71d034bf6e93f8633cfcbae8c484c983d579453b12a13546183c', '27d3cb4b0f43f5a7c6427e8916da4e2efedca916518316d17263c6323e335fed', 2, '2026-01-08 05:30:00'),
(6, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 5, 'Maintenance Jan-26 Flat A-105', 6957.50, 13450.00, '27d3cb4b0f43f5a7c6427e8916da4e2efedca916518316d17263c6323e335fed', '8c8d2edcbaefec95eecdaeef31040ee31bfe8ac6e7af7a92e2d55654eb731471', 2, '2026-01-09 10:50:00'),
(7, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 6, 'Maintenance Jan-26 Flat A-210', 11000.00, 24450.00, '8c8d2edcbaefec95eecdaeef31040ee31bfe8ac6e7af7a92e2d55654eb731471', '89a39e8370f7de2b009e093ef952bd1d2fb3aece6600dffc6581a149343acb58', 2, '2026-01-10 02:30:00'),
(8, 1, 'DEBIT', 'VENDOR_EXPENSE', 'vendor_expense', 2, 'MSEDCL Common Area Electricity', 18920.00, 5530.00, '89a39e8370f7de2b009e093ef952bd1d2fb3aece6600dffc6581a149343acb58', '9f0889c436c1c1c922e7e3d0607b9560ae3e282e38a7099e3032d8355ef97e07', 2, '2026-01-20 08:30:00'),
(9, 1, 'DEBIT', 'VENDOR_EXPENSE', 'vendor_expense', 3, 'Bajaj Security Payroll Jan-26', 42000.00, -36470.00, '9f0889c436c1c1c922e7e3d0607b9560ae3e282e38a7099e3032d8355ef97e07', 'c25f3c0d6614213dd6baddf45c90bfad61608df720ab0946107e40dc61e10cb3', 2, '2026-01-31 04:30:00'),
(10, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 7, 'Maintenance Mar-26 Flat A-101', 7590.00, -28880.00, 'c25f3c0d6614213dd6baddf45c90bfad61608df720ab0946107e40dc61e10cb3', '094be2360cc6c91e4d052ea0eaacd628cdb8cb86c673618ecd3845361472ec84', 2, '2026-03-04 04:30:00'),
(11, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 8, 'Maintenance Mar-26 Flat A-204', 9487.50, -19392.50, '094be2360cc6c91e4d052ea0eaacd628cdb8cb86c673618ecd3845361472ec84', 'bdf9ccc3adeacce5dd6d1c76aa3c0f082f3927c1e373b29476c781c28a57a466', 2, '2026-03-05 07:00:00'),
(12, 1, 'CREDIT', 'MAINTENANCE', 'upi_reconciliation', 9, 'Maintenance Mar-26 Flat B-302', 5692.50, -13700.00, 'bdf9ccc3adeacce5dd6d1c76aa3c0f082f3927c1e373b29476c781c28a57a466', '8b690329c5cb42e82e84457774bcea1a078ad531bbd6581a55ae75419c3093e6', 2, '2026-03-06 10:15:00')
ON DUPLICATE KEY UPDATE row_hash=VALUES(row_hash), prev_hash=VALUES(prev_hash);
