-- ============================================================
-- VastuLedger Complete MySQL DDL (Multi-Tenant SaaS Architecture)
-- ============================================================

CREATE TABLE IF NOT EXISTS societies (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(100) NOT NULL UNIQUE,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  address             TEXT NOT NULL,
  city                VARCHAR(100) NOT NULL,
  state               VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
  pincode             VARCHAR(10) NOT NULL,
  contact_email       VARCHAR(255) NOT NULL,
  contact_phone       VARCHAR(20),
  status              ENUM('ACTIVE', 'SUSPENDED', 'DEMO') DEFAULT 'ACTIVE',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wings (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id    BIGINT NOT NULL,
  name          VARCHAR(50) NOT NULL,
  code          VARCHAR(10) NOT NULL,
  total_floors  INT NOT NULL DEFAULT 1,
  has_elevator  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  UNIQUE KEY uk_society_wing_code (society_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flats (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NOT NULL,
  wing_id         BIGINT NULL,
  wing            CHAR(5) NOT NULL,
  floor           INT NOT NULL DEFAULT 1,
  number          VARCHAR(20) NOT NULL,
  address         VARCHAR(255),
  area_sqft       INT NOT NULL,
  bhk             VARCHAR(20) NOT NULL DEFAULT '2BHK',
  is_occupied     BOOLEAN DEFAULT TRUE,
  occupancy_type  ENUM('OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT') DEFAULT 'OWNER_OCCUPIED',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (wing_id) REFERENCES wings(id) ON DELETE SET NULL,
  UNIQUE KEY uk_society_flat_number (society_id, number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone_encrypted TEXT NULL,
  pan_encrypted   TEXT NULL,
  role            ENUM('ADMIN','TREASURER','COMMITTEE','RESIDENT') NOT NULL DEFAULT 'RESIDENT',
  is_superadmin   BOOLEAN DEFAULT FALSE,
  flat_id         BIGINT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS society_memberships (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id    BIGINT NOT NULL,
  user_id       BIGINT NOT NULL,
  role          ENUM('ADMIN', 'TREASURER', 'COMMITTEE', 'RESIDENT') NOT NULL,
  flat_id       BIGINT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
  UNIQUE KEY uk_user_society (user_id, society_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  refresh_token   VARCHAR(512) NOT NULL,
  device_info     VARCHAR(255),
  ip_address      VARCHAR(45),
  expires_at      DATETIME NOT NULL,
  revoked         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_token (refresh_token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  society_id      BIGINT NOT NULL,
  setting_key     VARCHAR(100) NOT NULL,
  setting_value   TEXT NOT NULL,
  updated_by      BIGINT NULL,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (society_id, setting_key),
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maintenance_bills (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NOT NULL,
  flat_id         BIGINT NOT NULL,
  billing_cycle   DATE NOT NULL,
  base_amount     DECIMAL(12,2) NOT NULL,
  sinking_fund    DECIMAL(12,2) NOT NULL DEFAULT 0,
  repair_fund     DECIMAL(12,2) NOT NULL DEFAULT 0,
  non_occupancy   DECIMAL(12,2) NOT NULL DEFAULT 0,
  late_fee        DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL,
  status          ENUM('PENDING','PAID','OVERDUE') DEFAULT 'PENDING',
  due_date        DATE NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
  UNIQUE KEY uk_flat_cycle (flat_id, billing_cycle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS upi_reconciliations (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NOT NULL,
  bill_id         BIGINT NOT NULL,
  utr             VARCHAR(22) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  submitted_by    BIGINT NULL,
  verified_by     BIGINT NULL,
  status          ENUM('SUBMITTED','VERIFIED','REJECTED') DEFAULT 'SUBMITTED',
  reconciled_at   TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES maintenance_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  UNIQUE (utr)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id        BIGINT NOT NULL,
  transaction_type  ENUM('CREDIT','DEBIT') NOT NULL,
  category          VARCHAR(100) NOT NULL,
  reference_type    VARCHAR(50) NULL,
  reference_id      BIGINT NULL,
  description       TEXT,
  amount            DECIMAL(12,2) NOT NULL,
  balance_after     DECIMAL(14,2) NOT NULL DEFAULT 0,
  prev_hash         CHAR(64) NOT NULL,
  row_hash          CHAR(64) NOT NULL,
  created_by        BIGINT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_ledger_created (society_id, created_at),
  INDEX idx_ledger_hash (society_id, row_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor_expenses (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id        BIGINT NOT NULL,
  vendor_name       VARCHAR(255) NOT NULL,
  expense_category  VARCHAR(100) NOT NULL,
  description       TEXT,
  amount            DECIMAL(12,2) NOT NULL,
  gst_amount        DECIMAL(12,2) DEFAULT 0,
  incurred_at       DATE NOT NULL,
  receipt_path      VARCHAR(255) NULL,
  status            ENUM('PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'PENDING_APPROVAL',
  created_by        BIGINT NOT NULL,
  approved_by       BIGINT NULL,
  rejection_reason  TEXT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agm_polls (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  options         JSON NOT NULL,
  start_date      DATETIME NOT NULL,
  end_date        DATETIME NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      BIGINT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS poll_votes (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  poll_id         BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  flat_id         BIGINT NOT NULL,
  choice          VARCHAR(100) NOT NULL,
  voted_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (poll_id, flat_id),
  FOREIGN KEY (poll_id) REFERENCES agm_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NULL,
  user_id         BIGINT NOT NULL,
  action          VARCHAR(255) NOT NULL,
  entity_type     VARCHAR(100) NULL,
  entity_id       BIGINT NULL,
  details         JSON,
  ip_address      VARCHAR(45),
  occurred_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_time (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id      BIGINT NOT NULL,
  user_id         BIGINT NULL,
  role            VARCHAR(50) NULL,
  title           VARCHAR(255) NOT NULL,
  detail          TEXT NOT NULL,
  type            ENUM('UPI', 'EXPENSE', 'POLL', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  link            VARCHAR(255) NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_soc (society_id),
  INDEX idx_notif_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
