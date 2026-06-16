import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Challenge } from '@footprint/shared-types';

const DB_PATH = path.join(process.cwd(), 'footprint.db');

// Ensure db directory or DB file exists
const db = new sqlite3.Database(DB_PATH);

export function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export async function initDatabase() {
  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      current_level INTEGER DEFAULT 1,
      total_leaves INTEGER DEFAULT 0,
      postal_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS carbon_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      source_provider TEXT NOT NULL,
      raw_value REAL NOT NULL,
      raw_unit TEXT NOT NULL,
      computed_co2e_kg REAL NOT NULL,
      region_code TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward_leaves INTEGER NOT NULL,
      target_days INTEGER NOT NULL,
      current_streak INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      progress_logs TEXT NOT NULL,
      reward_applied INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sponsor_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      coupon_code TEXT,
      cost_leaves INTEGER NOT NULL,
      redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully at:', DB_PATH);
}

// Help seed user challenges
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
