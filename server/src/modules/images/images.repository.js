import db from '../../config/database.js';

export function getTodayCandidates() {
  const stmt = db.prepare(`
    SELECT * FROM image_candidates 
    WHERE date(created_at) = date('now')
    ORDER BY quality_score DESC
  `);
  return stmt.all();
}

export function getCandidateById(id) {
  const stmt = db.prepare('SELECT * FROM image_candidates WHERE id = ?');
  return stmt.get(id);
}

export function saveCandidate(candidate) {
  const stmt = db.prepare(`
    INSERT INTO image_candidates (image_url, source_name, title, category)
    VALUES (@image_url, @source_name, @title, @category)
  `);
  const info = stmt.run(candidate);
  return { ...candidate, id: info.lastInsertRowid };
}

export function updateCandidateScore(id, score, thumbnailPath = null) {
  const stmt = db.prepare(`
    UPDATE image_candidates 
    SET quality_score = ?, thumbnail_path = COALESCE(?, thumbnail_path)
    WHERE id = ?
  `);
  return stmt.run(score, thumbnailPath, id);
}

export function updateCandidateStatus(id, status) {
  const stmt = db.prepare('UPDATE image_candidates SET status = ? WHERE id = ?');
  return stmt.run(status, id);
}

export function deleteCandidate(id) {
  const stmt = db.prepare('DELETE FROM image_candidates WHERE id = ?');
  return stmt.run(id);
}

export function isUrlAlreadyCandidate(url) {
  const stmt = db.prepare('SELECT id FROM image_candidates WHERE image_url = ? LIMIT 1');
  return !!stmt.get(url);
}
