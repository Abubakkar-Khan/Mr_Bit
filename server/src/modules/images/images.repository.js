import db from '../../config/database.js';

export function getTodayCandidates() {
  const stmt = db.prepare(`
    SELECT * FROM image_candidates 
    WHERE date(created_at) = date('now')
    ORDER BY quality_score DESC
  `);
  return stmt.all();
}

export function getAllCandidates(limit = 100, stage = null) {
  let sql = 'SELECT * FROM image_candidates';
  const params = [];

  if (stage) {
    sql += ' WHERE filter_stage = ?';
    params.push(stage);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function getCandidateById(id) {
  const stmt = db.prepare('SELECT * FROM image_candidates WHERE id = ?');
  return stmt.get(id);
}

export function saveCandidate(candidate) {
  const stmt = db.prepare(`
    INSERT INTO image_candidates (
      image_url, source_name, title, category, saves_count, width, height,
      opencv_sharpness, opencv_contrast, onnx_aesthetic_score, filter_stage, filter_reason
    )
    VALUES (
      @image_url, @source_name, @title, @category, @saves_count, @width, @height,
      @opencv_sharpness, @opencv_contrast, @onnx_aesthetic_score, @filter_stage, @filter_reason
    )
  `);

  const info = stmt.run({
    image_url: candidate.image_url,
    source_name: candidate.source_name || 'pinterest',
    title: candidate.title || 'Untitled',
    category: candidate.category || 'art',
    saves_count: candidate.saves_count || 0,
    width: candidate.width || 0,
    height: candidate.height || 0,
    opencv_sharpness: candidate.opencv_sharpness || 0,
    opencv_contrast: candidate.opencv_contrast || 0,
    onnx_aesthetic_score: candidate.onnx_aesthetic_score || 0,
    filter_stage: candidate.filter_stage || 'candidate',
    filter_reason: candidate.filter_reason || ''
  });

  return { ...candidate, id: info.lastInsertRowid };
}

export function updateCandidateAnalysis(id, updateData) {
  const stmt = db.prepare(`
    UPDATE image_candidates 
    SET quality_score = COALESCE(@quality_score, quality_score),
        opencv_sharpness = COALESCE(@opencv_sharpness, opencv_sharpness),
        opencv_contrast = COALESCE(@opencv_contrast, opencv_contrast),
        onnx_aesthetic_score = COALESCE(@onnx_aesthetic_score, onnx_aesthetic_score),
        filter_stage = COALESCE(@filter_stage, filter_stage),
        filter_reason = COALESCE(@filter_reason, filter_reason),
        thumbnail_path = COALESCE(@thumbnail_path, thumbnail_path),
        width = COALESCE(@width, width),
        height = COALESCE(@height, height),
        status = COALESCE(@status, status)
    WHERE id = @id
  `);

  return stmt.run({
    id,
    quality_score: updateData.quality_score ?? null,
    opencv_sharpness: updateData.opencv_sharpness ?? null,
    opencv_contrast: updateData.opencv_contrast ?? null,
    onnx_aesthetic_score: updateData.onnx_aesthetic_score ?? null,
    filter_stage: updateData.filter_stage ?? null,
    filter_reason: updateData.filter_reason ?? null,
    thumbnail_path: updateData.thumbnail_path ?? null,
    width: updateData.width ?? null,
    height: updateData.height ?? null,
    status: updateData.status ?? null
  });
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
