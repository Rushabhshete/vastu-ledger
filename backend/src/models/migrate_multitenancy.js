import pool from "../config/db.js";
import bcrypt from "bcryptjs";

export async function runMigration() {
  console.log("[Migration] Starting Multi-Tenancy & Platform SuperAdmin migration...");
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Create societies table
    console.log("[Migration] 1. Creating societies table...");
    await conn.query(`
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
    `);

    // 2. Insert Default Society 1 if not exists
    console.log("[Migration] 2. Ensuring Default Society 1 exists...");
    const [existingSoc] = await conn.query(`SELECT id FROM societies WHERE id = 1`);
    if (existingSoc.length === 0) {
      await conn.query(`
        INSERT INTO societies (id, name, slug, registration_number, address, city, state, pincode, contact_email, contact_phone, status)
        VALUES (
          1,
          'Vastu Heights Co-operative Housing Society',
          'vastu-heights',
          'MAH/PUN/RWA/2026/411045',
          'Plot 42, Baner Hill Trail, Baner',
          'Pune',
          'Maharashtra',
          '411045',
          'admin@vastuledger.in',
          '+91 98765 43210',
          'ACTIVE'
        );
      `);
    }

    // 3. Create wings table
    console.log("[Migration] 3. Creating wings table...");
    await conn.query(`
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
    `);

    // Insert Default Wings for Society 1
    const [wingA] = await conn.query(`SELECT id FROM wings WHERE society_id = 1 AND code = 'A'`);
    if (wingA.length === 0) {
      await conn.query(`
        INSERT INTO wings (society_id, name, code, total_floors, has_elevator)
        VALUES (1, 'Wing A (Lotus Tower)', 'A', 5, TRUE);
      `);
    }
    const [wingB] = await conn.query(`SELECT id FROM wings WHERE society_id = 1 AND code = 'B'`);
    if (wingB.length === 0) {
      await conn.query(`
        INSERT INTO wings (society_id, name, code, total_floors, has_elevator)
        VALUES (1, 'Wing B (Gulmohar Tower)', 'B', 5, TRUE);
      `);
    }

    // 4. Update flats table
    console.log("[Migration] 4. Updating flats table columns...");
    // Check columns in flats
    const [flatCols] = await conn.query(`SHOW COLUMNS FROM flats`);
    const flatColNames = flatCols.map((c) => c.Field);

    if (!flatColNames.includes("society_id")) {
      await conn.query(`ALTER TABLE flats ADD COLUMN society_id BIGINT NOT NULL DEFAULT 1 AFTER id`);
      await conn.query(`ALTER TABLE flats ADD CONSTRAINT fk_flats_society FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE`);
    }

    if (!flatColNames.includes("wing_id")) {
      await conn.query(`ALTER TABLE flats ADD COLUMN wing_id BIGINT NULL AFTER society_id`);
      await conn.query(`ALTER TABLE flats ADD CONSTRAINT fk_flats_wing FOREIGN KEY (wing_id) REFERENCES wings(id) ON DELETE SET NULL`);
    }

    if (!flatColNames.includes("floor")) {
      await conn.query(`ALTER TABLE flats ADD COLUMN floor INT NOT NULL DEFAULT 1 AFTER wing`);
    }

    if (!flatColNames.includes("occupancy_type")) {
      await conn.query(`ALTER TABLE flats ADD COLUMN occupancy_type ENUM('OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT') DEFAULT 'OWNER_OCCUPIED' AFTER bhk`);
    }

    // Ensure number is alphanumeric VARCHAR(20)
    await conn.query(`ALTER TABLE flats MODIFY COLUMN number VARCHAR(20) NOT NULL`);

    // Link existing flats to wing_id
    const [wings1] = await conn.query(`SELECT id, code FROM wings WHERE society_id = 1`);
    for (const w of wings1) {
      await conn.query(`UPDATE flats SET wing_id = ? WHERE society_id = 1 AND wing = ?`, [w.id, w.code]);
    }

    // Calculate floors for existing flats (e.g. flat 101 -> floor 1, flat 204 -> floor 2, flat 302 -> floor 3, flat 401 -> floor 4)
    await conn.query(`UPDATE flats SET floor = 1 WHERE number LIKE '1%' AND floor = 1`);
    await conn.query(`UPDATE flats SET floor = 2 WHERE number LIKE '2%'`);
    await conn.query(`UPDATE flats SET floor = 3 WHERE number LIKE '3%'`);
    await conn.query(`UPDATE flats SET floor = 4 WHERE number LIKE '4%'`);

    // 5. Update users table for SuperAdmin
    console.log("[Migration] 5. Updating users table for SuperAdmin...");
    const [userCols] = await conn.query(`SHOW COLUMNS FROM users`);
    const userColNames = userCols.map((c) => c.Field);

    if (!userColNames.includes("is_superadmin")) {
      await conn.query(`ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE AFTER role`);
    }

    // Create or update Platform SuperAdmin user
    const [superUser] = await conn.query(`SELECT id FROM users WHERE email = 'superadmin@vastuledger.in'`);
    const superHash = await bcrypt.hash("Vastu@2026", 10);
    if (superUser.length === 0) {
      await conn.query(`
        INSERT INTO users (email, password_hash, full_name, role, is_superadmin, is_active)
        VALUES ('superadmin@vastuledger.in', ?, 'Platform Owner (SuperAdmin)', 'ADMIN', TRUE, TRUE);
      `, [superHash]);
      console.log("[Migration] Created superadmin@vastuledger.in user ✓");
    } else {
      await conn.query(`UPDATE users SET is_superadmin = TRUE, password_hash = ? WHERE id = ?`, [superHash, superUser[0].id]);
    }

    // 6. Create society_memberships table (Option 1B: user can belong to multiple societies with specific roles)
    console.log("[Migration] 6. Creating society_memberships table...");
    await conn.query(`
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
    `);

    // Populate existing users into society_memberships for Society 1
    const [existingUsers] = await conn.query(`SELECT id, role, flat_id FROM users WHERE is_superadmin = FALSE`);
    for (const u of existingUsers) {
      await conn.query(`
        INSERT INTO society_memberships (society_id, user_id, role, flat_id)
        VALUES (1, ?, ?, ?)
        ON DUPLICATE KEY UPDATE role = VALUES(role), flat_id = VALUES(flat_id);
      `, [u.id, u.role, u.flat_id]);
    }

    // 7. Add society_id to all operational tables if missing
    console.log("[Migration] 7. Partitioning operational tables by society_id...");
    const tablesToPartition = [
      { name: "system_settings", hasPK: true },
      { name: "maintenance_bills" },
      { name: "upi_reconciliations" },
      { name: "ledger_transactions" },
      { name: "vendor_expenses" },
      { name: "agm_polls" },
      { name: "audit_logs" },
    ];

    for (const tbl of tablesToPartition) {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tbl.name}\``);
      const names = cols.map((c) => c.Field);
      if (!names.includes("society_id")) {
        console.log(`[Migration] Adding society_id to ${tbl.name}...`);
        await conn.query(`ALTER TABLE \`${tbl.name}\` ADD COLUMN society_id BIGINT NOT NULL DEFAULT 1`);
        await conn.query(`ALTER TABLE \`${tbl.name}\` ADD CONSTRAINT \`fk_${tbl.name}_society\` FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE`);
      }
    }

    // Handle system_settings primary key update if needed
    const [ssKeys] = await conn.query(`SHOW KEYS FROM system_settings WHERE Key_name = 'PRIMARY'`);
    const pkCols = ssKeys.map((k) => k.Column_name);
    if (!pkCols.includes("society_id")) {
      console.log("[Migration] Updating system_settings composite primary key (society_id, setting_key)...");
      await conn.query(`ALTER TABLE system_settings DROP PRIMARY KEY, ADD PRIMARY KEY (society_id, setting_key)`);
    }

    await conn.commit();
    console.log("[Migration] ✓ Multi-Tenancy & Platform SuperAdmin migration completed successfully!");
  } catch (err) {
    await conn.rollback();
    console.error("[Migration FAILED]:", err);
    throw err;
  } finally {
    conn.release();
  }
}

// Auto-run when executed directly
if (process.argv[1]?.includes("migrate_multitenancy.js")) {
  runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}
