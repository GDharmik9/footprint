import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { getSecret } from './gcp.js';

const { Pool } = pg;

let pool: pg.Pool;
let isUsingPostgres = true;

// Zero-dependency local JSON file database fallback
const LOCAL_DB_PATH = path.join(process.cwd(), 'footprint_dev_db.json');
interface LocalDB {
  users: any[];
  carbon_events: any[];
  challenges: any[];
  vouchers: any[];
  leagues: any[];
}
let localData: LocalDB = { users: [], carbon_events: [], challenges: [], vouchers: [], leagues: [] };

function loadLocalData() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      localData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
    } catch (e) {
      console.error('Failed to parse local JSON database:', e);
    }
  }
}

function saveLocalData() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localData, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save local JSON database:', e);
  }
}

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (isUsingPostgres) {
    const convertedSql = convertPlaceholders(sql);
    const res = await pool.query(convertedSql, params);
    return res.rows as T[];
  }
  return evaluateLocalQuery<T>(sql, params);
}

export async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  if (isUsingPostgres) {
    const convertedSql = convertPlaceholders(sql);
    const res = await pool.query(convertedSql, params);
    return (res.rows[0] as T) || null;
  }
  const rows = evaluateLocalQuery<T>(sql, params);
  return rows[0] || null;
}

export async function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  if (isUsingPostgres) {
    const convertedSql = convertPlaceholders(sql);
    const res = await pool.query(convertedSql, params);
    return { lastID: 0, changes: res.rowCount || 0 };
  }
  return evaluateLocalRun(sql, params);
}

/**
 * Converts SQLite "?" placeholders to PostgreSQL "$1, $2, ..." placeholders.
 */
function convertPlaceholders(sql: string): string {
  let placeholderCount = 1;
  return sql.replace(/\?/g, () => `$${placeholderCount++}`);
}

export async function initDatabase() {
  const connectionString = 
    await getSecret('DATABASE_URL') || 
    process.env.DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/footprint';

  console.log('Connecting to PostgreSQL database...');
  pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 2000 // Quick timeout to trigger dev fallback
  });

  try {
    // Attempt a quick connection query
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL database connected successfully.');
    isUsingPostgres = true;

    // Create tables using PostgreSQL syntax
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL,
        current_level INT DEFAULT 1,
        total_leaves INT DEFAULT 0,
        postal_code VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS carbon_events (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        source_provider VARCHAR(50) NOT NULL,
        raw_value DOUBLE PRECISION NOT NULL,
        raw_unit VARCHAR(50) NOT NULL,
        computed_co2e_kg DOUBLE PRECISION NOT NULL,
        region_code VARCHAR(20),
        timestamp TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS challenges (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        reward_leaves INT NOT NULL,
        target_days INT NOT NULL,
        current_streak INT DEFAULT 0,
        completed INT DEFAULT 0,
        progress_logs TEXT NOT NULL,
        reward_applied INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        sponsor_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        coupon_code VARCHAR(100),
        cost_leaves INT NOT NULL,
        redeemed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS leagues (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        username VARCHAR(100) NOT NULL,
        leaves INT DEFAULT 0,
        level INT DEFAULT 1,
        is_mock INT DEFAULT 1
      )
    `);
  } catch (err: any) {
    console.warn('\n⚠️  PostgreSQL connection failed. Falling back to local zero-dependency database JSON: footprint_dev_db.json\n');
    isUsingPostgres = false;
    loadLocalData();
  }
}

export async function seedUserChallenges(userId: string) {
  const challengesExist = await queryOne('SELECT id FROM challenges WHERE user_id = ?', [userId]);
  if (!challengesExist) {
    const coldWashId = `cw-${userId}`;
    const vampireId = `vh-${userId}`;

    const emptyProgress = JSON.stringify([false, false, false, false, false, false, false]);

    await run(`
      INSERT INTO challenges (id, user_id, type, title, description, reward_leaves, target_days, current_streak, completed, progress_logs, reward_applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      coldWashId,
      userId,
      'cold-wash',
      'The Cold-Wash Campaign 🧺',
      'Run all laundry washes using cold water settings for 7 consecutive days.',
      100,
      7,
      0,
      0,
      emptyProgress,
      0
    ]);

    await run(`
      INSERT INTO challenges (id, user_id, type, title, description, reward_leaves, target_days, current_streak, completed, progress_logs, reward_applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vampireId,
      userId,
      'vampire-hunt',
      'The Vampire Hunt 🧛‍♂️',
      'Disconnect 3 standby home electronics (consoles, idle chargers, secondary displays) before sleeping for 7 consecutive days.',
      120,
      7,
      0,
      0,
      emptyProgress,
      0
    ]);
  }
}

export async function seedWeeklyLeague(userId: string) {
  const userExistInLeague = await queryOne('SELECT id FROM leagues WHERE user_id = ?', [userId]);
  if (!userExistInLeague) {
    const user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (user) {
      await run(`
        INSERT INTO leagues (id, user_id, username, leaves, level, is_mock)
        VALUES (?, ?, ?, ?, ?, 0)
      `, [`l-${userId}`, userId, user.display_name, user.total_leaves, user.current_level]);

      const usernames = [
        'GreenLover', 'EcoPioneer', 'SolarWarrior', 'WindRider', 'ZeroWaste', 
        'EarthGuardian', 'BikeCommuter', 'OatMilkFan', 'ColdWasher', 'VampireHunter', 
        'ForestFriend', 'CarbonBuster', 'RecycleKing', 'CleanGrid', 'TeslaRider', 
        'NatureWalk', 'SproutGrower', 'TreePlanter', 'EcoChamp', 'EcoSquire', 
        'GreenGladiator', 'HumbleRoot', 'SolarSailor', 'IvyVines', 'EcoExplorer', 
        'LushLeaves', 'CompostKing', 'GreenGoddess', 'Wildwood'
      ];

      for (let i = 0; i < usernames.length; i++) {
        const mockLeaves = Math.floor(Math.random() * 600) + 50;
        const mockLevel = mockLeaves < 100 ? 1 : mockLeaves < 250 ? 2 : mockLeaves < 500 ? 3 : 4;
        await run(`
          INSERT INTO leagues (id, user_id, username, leaves, level, is_mock)
          VALUES (?, NULL, ?, ?, ?, 1)
        `, [`l-mock-${userId}-${i}`, usernames[i], mockLeaves, mockLevel]);
      }
    }
  }
}

/**
 * Evaluates local select queries on our JSON database
 */
function evaluateLocalQuery<T>(sql: string, params: any[]): T[] {
  const norm = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT * FROM users WHERE id = ?
  if (norm.startsWith('SELECT * FROM users WHERE id =')) {
    const id = params[0];
    return localData.users.filter(u => u.id === id) as T[];
  }

  // 2. SELECT id FROM challenges WHERE user_id = ?
  if (norm.startsWith('SELECT id FROM challenges WHERE user_id =')) {
    const userId = params[0];
    return localData.challenges.filter(c => c.user_id === userId).map(c => ({ id: c.id })) as T[];
  }

  // 3. SELECT * FROM challenges WHERE user_id = ? AND type = ?
  if (norm.startsWith('SELECT * FROM challenges WHERE user_id =') && norm.includes('AND type =')) {
    const userId = params[0];
    const type = params[1];
    return localData.challenges.filter(c => c.user_id === userId && c.type === type) as T[];
  }

  // 4. SELECT * FROM challenges WHERE user_id = ?
  if (norm.startsWith('SELECT * FROM challenges WHERE user_id =')) {
    const userId = params[0];
    return localData.challenges.filter(c => c.user_id === userId) as T[];
  }

  // 5. SELECT * FROM carbon_events WHERE user_id = ? ORDER BY timestamp DESC
  if (norm.startsWith('SELECT * FROM carbon_events WHERE user_id =')) {
    const userId = params[0];
    const filtered = localData.carbon_events.filter(e => e.user_id === userId);
    // Sort descending by timestamp
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return filtered as T[];
  }

  // 6. SELECT * FROM vouchers WHERE user_id = ? ORDER BY redeemed_at DESC
  if (norm.startsWith('SELECT * FROM vouchers WHERE user_id =')) {
    const userId = params[0];
    const filtered = localData.vouchers.filter(v => v.user_id === userId);
    filtered.sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime());
    return filtered as T[];
  }

  // 7. SELECT * FROM leagues ORDER BY leaves DESC
  if (norm.startsWith('SELECT * FROM leagues')) {
    const sorted = [...localData.leagues];
    sorted.sort((a, b) => b.leaves - a.leaves);
    return sorted as T[];
  }

  return [];
}

/**
 * Evaluates local write/update runs on our JSON database
 */
function evaluateLocalRun(sql: string, params: any[]): { lastID: number; changes: number } {
  const norm = sql.trim().replace(/\s+/g, ' ');

  // 1. INSERT INTO users
  if (norm.startsWith('INSERT INTO users')) {
    const [id, display_name, current_level, total_leaves, postal_code] = params;
    // Check if user exists
    if (!localData.users.some(u => u.id === id)) {
      localData.users.push({
        id,
        display_name,
        current_level,
        total_leaves,
        postal_code,
        created_at: new Date().toISOString()
      });
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  // 2. INSERT INTO challenges
  if (norm.startsWith('INSERT INTO challenges')) {
    const [id, user_id, type, title, description, reward_leaves, target_days, current_streak, completed, progress_logs, reward_applied] = params;
    if (!localData.challenges.some(c => c.id === id)) {
      localData.challenges.push({
        id,
        user_id,
        type,
        title,
        description,
        reward_leaves,
        target_days,
        current_streak,
        completed,
        progress_logs,
        reward_applied,
        updated_at: new Date().toISOString()
      });
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  // 3. INSERT INTO carbon_events
  if (norm.startsWith('INSERT INTO carbon_events')) {
    const [id, user_id, category, source_provider, raw_value, raw_unit, computed_co2e_kg, region_code, timestamp] = params;
    localData.carbon_events.push({
      id,
      user_id,
      category,
      source_provider,
      raw_value,
      raw_unit,
      computed_co2e_kg,
      region_code,
      timestamp
    });
    saveLocalData();
    return { lastID: 0, changes: 1 };
  }

  // 4. INSERT INTO vouchers
  if (norm.startsWith('INSERT INTO vouchers')) {
    const [id, user_id, sponsor_name, title, description, reward_type, coupon_code, cost_leaves] = params;
    localData.vouchers.push({
      id,
      user_id,
      sponsor_name,
      title,
      description,
      reward_type,
      coupon_code,
      cost_leaves,
      redeemed_at: new Date().toISOString()
    });
    saveLocalData();
    return { lastID: 0, changes: 1 };
  }

  // 5. UPDATE users SET total_leaves = ?, current_level = ? WHERE id = ?
  if (norm.startsWith('UPDATE users SET total_leaves =')) {
    const [total_leaves, current_level, id] = params;
    const idx = localData.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      localData.users[idx].total_leaves = total_leaves;
      localData.users[idx].current_level = current_level;
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  // 6. UPDATE challenges SET progress_logs = ... WHERE user_id = ? AND type = ?
  if (norm.startsWith('UPDATE challenges SET progress_logs =')) {
    const [progress_logs, current_streak, completed, reward_applied, user_id, type] = params;
    const idx = localData.challenges.findIndex(c => c.user_id === user_id && c.type === type);
    if (idx !== -1) {
      localData.challenges[idx].progress_logs = progress_logs;
      localData.challenges[idx].current_streak = current_streak;
      localData.challenges[idx].completed = completed;
      localData.challenges[idx].reward_applied = reward_applied;
      localData.challenges[idx].updated_at = new Date().toISOString();
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  // 7. INSERT INTO leagues
  if (norm.startsWith('INSERT INTO leagues')) {
    const [id, user_id, username, leaves, level, is_mock] = params;
    if (!localData.leagues.some(l => l.id === id)) {
      localData.leagues.push({ id, user_id, username, leaves, level, is_mock });
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  // 8. UPDATE leagues SET leaves = ?, level = ? WHERE user_id = ?
  if (norm.startsWith('UPDATE leagues SET leaves =')) {
    const [leaves, level, user_id] = params;
    const idx = localData.leagues.findIndex(l => l.user_id === user_id);
    if (idx !== -1) {
      localData.leagues[idx].leaves = leaves;
      localData.leagues[idx].level = level;
      saveLocalData();
      return { lastID: 0, changes: 1 };
    }
    return { lastID: 0, changes: 0 };
  }

  return { lastID: 0, changes: 0 };
}
