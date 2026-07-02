import db from '../../config/database.js';

export function getAllPosts() {
  const stmt = db.prepare('SELECT * FROM posts ORDER BY created_at DESC');
  return stmt.all();
}

export function getTodayPost() {
  const stmt = db.prepare("SELECT * FROM posts WHERE date(created_at) = date('now') LIMIT 1");
  return stmt.get();
}

export function createPostRecord(postData) {
  const stmt = db.prepare(`
    INSERT INTO posts (candidate_id, image_url, ascii_output_path, caption, status)
    VALUES (@candidate_id, @image_url, @ascii_output_path, @caption, @status)
  `);
  const info = stmt.run(postData);
  return { ...postData, id: info.lastInsertRowid };
}

export function updatePostStatus(id, status, error_message = null, facebook_post_id = null) {
  const stmt = db.prepare(`
    UPDATE posts 
    SET status = ?, 
        error_message = COALESCE(?, error_message),
        facebook_post_id = COALESCE(?, facebook_post_id),
        posted_at = CASE WHEN ? = 'posted' THEN CURRENT_TIMESTAMP ELSE posted_at END
    WHERE id = ?
  `);
  return stmt.run(status, error_message, facebook_post_id, status, id);
}

export function getPostById(id) {
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  return stmt.get(id);
}
