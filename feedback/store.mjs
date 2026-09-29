// SQLite storage of the feedback service (node:sqlite, no dependencies).
// Ratings and favourites carry the player's name (they agreed to it in the dialog); usage figures only a
// salted hash of it, so we can count people and visits per variant without a list of who looked when.
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

// Loaded via require: Vite (tests) does not list node:sqlite as a built-in on Node 22 and would try to bundle it.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ratings (
  experiment TEXT NOT NULL, variant TEXT NOT NULL, username TEXT NOT NULL,
  stars INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL, updated INTEGER NOT NULL,
  PRIMARY KEY (experiment, variant, username)
);
CREATE TABLE IF NOT EXISTS favorites (
  experiment TEXT NOT NULL, username TEXT NOT NULL, variant TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated INTEGER NOT NULL,
  PRIMARY KEY (experiment, username)
);
CREATE TABLE IF NOT EXISTS exposures (
  experiment TEXT NOT NULL, variant TEXT NOT NULL, user_hash TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0, dwell_ms INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
  PRIMARY KEY (experiment, variant, user_hash)
);
CREATE TABLE IF NOT EXISTS clicks (
  experiment TEXT NOT NULL, variant TEXT NOT NULL, target TEXT NOT NULL, count INTEGER NOT NULL,
  PRIMARY KEY (experiment, variant, target)
);
`;

/** Opens (and creates) the database; `path` ':memory:' for tests. */
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  // Databases from before the note („what should the winner take over?“)
  if (!db.prepare('PRAGMA table_info(favorites)').all().some((c) => c.name === 'note')) {
    db.exec("ALTER TABLE favorites ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  }

  let salt = db.prepare("SELECT value FROM meta WHERE key = 'salt'").get()?.value;
  if (!salt) {
    salt = randomBytes(16).toString('hex');
    db.prepare("INSERT INTO meta (key, value) VALUES ('salt', ?)").run(salt);
  }
  const hashOf = (username) => createHash('sha256').update(`${salt}:${username.toLowerCase()}`).digest('hex').slice(0, 24);

  const q = {
    rating: db.prepare(`INSERT INTO ratings (experiment, variant, username, stars, comment, created, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (experiment, variant, username) DO UPDATE SET stars = excluded.stars, comment = excluded.comment, updated = excluded.updated`),
    favorite: db.prepare(`INSERT INTO favorites (experiment, username, variant, note, updated) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (experiment, username) DO UPDATE SET variant = excluded.variant, note = excluded.note, updated = excluded.updated`),
    exposure: db.prepare(`INSERT INTO exposures (experiment, variant, user_hash, visits, dwell_ms, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (experiment, variant, user_hash) DO UPDATE SET visits = visits + excluded.visits,
        dwell_ms = dwell_ms + excluded.dwell_ms, last_seen = excluded.last_seen`),
    click: db.prepare(`INSERT INTO clicks (experiment, variant, target, count) VALUES (?, ?, ?, ?)
      ON CONFLICT (experiment, variant, target) DO UPDATE SET count = count + excluded.count`),
    myRatings: db.prepare('SELECT variant, stars, comment, updated FROM ratings WHERE experiment = ? AND username = ? COLLATE NOCASE'),
    myFavorite: db.prepare('SELECT variant, note FROM favorites WHERE experiment = ? AND username = ? COLLATE NOCASE'),
    allRatings: db.prepare('SELECT variant, username, stars, comment, created, updated FROM ratings WHERE experiment = ? ORDER BY updated DESC'),
    allFavorites: db.prepare('SELECT variant, COUNT(*) AS n FROM favorites WHERE experiment = ? GROUP BY variant'),
    favoriteNotes: db.prepare("SELECT variant, username, note, updated FROM favorites WHERE experiment = ? AND note != '' ORDER BY updated DESC"),
    allExposures: db.prepare('SELECT variant, visits, dwell_ms FROM exposures WHERE experiment = ?'),
    allClicks: db.prepare('SELECT variant, target, count FROM clicks WHERE experiment = ? ORDER BY count DESC'),
    experiments: db.prepare(`SELECT experiment, MAX(t) AS last FROM (
        SELECT experiment, last_seen AS t FROM exposures UNION ALL SELECT experiment, updated AS t FROM ratings
      ) GROUP BY experiment ORDER BY last DESC`),
  };

  return {
    close: () => db.close(),

    saveRating({ experiment, variant, username, stars, comment }, now) {
      q.rating.run(experiment, variant, username, stars, comment, now, now);
    },

    saveFavorite({ experiment, variant, username, note }, now) {
      q.favorite.run(experiment, username, variant, note, now);
    },

    /** One batch of usage figures from a browser: a visit, visible seconds, clicks per target. */
    saveUsage({ experiment, variant, username, visits, dwellMs, clicks }, now) {
      db.exec('BEGIN');
      try {
        q.exposure.run(experiment, variant, hashOf(username), visits, dwellMs, now, now);
        for (const [target, n] of Object.entries(clicks)) q.click.run(experiment, variant, target, n);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },

    mine(experiment, username) {
      const fav = q.myFavorite.get(experiment, username);
      return {
        ratings: q.myRatings.all(experiment, username).map((r) => ({ ...r })),
        favorite: fav?.variant ?? null,
        favoriteNote: fav?.note ?? '',
      };
    },

    /** Raw rows for the evaluation; summing up happens in `summarize` (app.mjs). */
    rows(experiment) {
      return {
        ratings: q.allRatings.all(experiment).map((r) => ({ ...r })),
        favorites: q.allFavorites.all(experiment).map((r) => ({ ...r })),
        favoriteNotes: q.favoriteNotes.all(experiment).map((r) => ({ ...r })),
        exposures: q.allExposures.all(experiment).map((r) => ({ ...r })),
        clicks: q.allClicks.all(experiment).map((r) => ({ ...r })),
      };
    },

    experiments() {
      return q.experiments.all().map((r) => ({ ...r }));
    },
  };
}
