const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'staff.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    global_staff_role TEXT,
    application_channel TEXT,
    log_channel TEXT,
    partnership_submission_channel TEXT,
    partnership_channel TEXT,
    partnership_log_channel TEXT,
    admin_verify_role TEXT,
    setup_complete INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    weekly_quota INTEGER DEFAULT 50,
    UNIQUE(guild_id, name)
  );

  CREATE TABLE IF NOT EXISTS category_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, role_id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    roles TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS staff_members (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    category TEXT,
    roles TEXT,
    joined_at TEXT DEFAULT (datetime('now')),
    on_loa INTEGER DEFAULT 0,
    loa_until TEXT,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS message_counts (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, week_start)
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    issued_by TEXT,
    issued_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS partnership_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ad_content TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at TEXT DEFAULT (datetime('now')),
    verified_by TEXT
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

module.exports = {
  db,
  getWeekStart,

  getGuildSettings(guildId) {
    return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) || null;
  },

  setGuildSetting(guildId, key, value) {
    const existing = this.getGuildSettings(guildId);
    if (!existing) {
      db.prepare('INSERT INTO guild_settings (guild_id) VALUES (?)').run(guildId);
    }
    db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
  },

  addCategory(guildId, name, quota = 50) {
    return db.prepare('INSERT OR IGNORE INTO categories (guild_id, name, weekly_quota) VALUES (?, ?, ?)').run(guildId, name, quota);
  },

  getCategories(guildId) {
    return db.prepare('SELECT * FROM categories WHERE guild_id = ?').all(guildId);
  },

  addCategoryRole(categoryId, roleId) {
    return db.prepare('INSERT OR IGNORE INTO category_roles (category_id, role_id) VALUES (?, ?)').run(categoryId, roleId);
  },

  getCategoryRoles(categoryId) {
    return db.prepare('SELECT role_id FROM category_roles WHERE category_id = ?').all(categoryId);
  },

  upsertStaff(userId, guildId, data = {}) {
    const existing = db.prepare('SELECT * FROM staff_members WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (existing) {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), userId, guildId];
      db.prepare(`UPDATE staff_members SET ${sets} WHERE user_id = ? AND guild_id = ?`).run(...values);
    } else {
      db.prepare(`
        INSERT INTO staff_members (user_id, guild_id, category, roles, on_loa)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, guildId, data.category || null, data.roles || '[]', data.on_loa || 0);
    }
  },

  getStaff(userId, guildId) {
    return db.prepare('SELECT * FROM staff_members WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  },

  getAllStaff(guildId) {
    return db.prepare('SELECT * FROM staff_members WHERE guild_id = ?').all(guildId);
  },

  incrementMessageCount(userId, guildId) {
    const week = getWeekStart();
    db.prepare(`
      INSERT INTO message_counts (user_id, guild_id, week_start, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, guild_id, week_start) DO UPDATE SET count = count + 1
    `).run(userId, guildId, week);
  },

  getMessageCount(userId, guildId) {
    const week = getWeekStart();
    const row = db.prepare('SELECT count FROM message_counts WHERE user_id = ? AND guild_id = ? AND week_start = ?').get(userId, guildId, week);
    return row ? row.count : 0;
  },

  addWarning(userId, guildId, type, reason, issuedBy) {
    const expires = new Date();
    expires.setDate(expires.getDate() + (10 * 7));
    return db.prepare(`
      INSERT INTO warnings (user_id, guild_id, type, reason, issued_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, guildId, type, reason, issuedBy, expires.toISOString());
  },

  getWarnings(userId, guildId, activeOnly = true) {
    if (activeOnly) {
      return db.prepare(`
        SELECT * FROM warnings 
        WHERE user_id = ? AND guild_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY issued_at DESC
      `).all(userId, guildId);
    }
    return db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY issued_at DESC').all(userId, guildId);
  },

  addPartnershipSubmission(guildId, userId, adContent, screenshotUrl) {
    return db.prepare(`
      INSERT INTO partnership_submissions (guild_id, user_id, ad_content, screenshot_url)
      VALUES (?, ?, ?, ?)
    `).run(guildId, userId, adContent, screenshotUrl);
  },

  updatePartnershipStatus(id, status, verifiedBy = null) {
    db.prepare('UPDATE partnership_submissions SET status = ?, verified_by = ? WHERE id = ?').run(status, verifiedBy, id);
  },

  addLog(guildId, type, content, userId = null) {
    db.prepare('INSERT INTO logs (guild_id, type, content, user_id) VALUES (?, ?, ?, ?)').run(guildId, type, content, userId);
  },

  getLogs(guildId, type = null, limit = 50) {
    if (type) {
      return db.prepare('SELECT * FROM logs WHERE guild_id = ? AND type = ? ORDER BY created_at DESC LIMIT ?').all(guildId, type, limit);
    }
    return db.prepare('SELECT * FROM logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?').all(guildId, limit);
  }
};
