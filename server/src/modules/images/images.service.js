import { fetchMetMuseumImages } from './sources/metmuseum.js';
import { fetchArtInstituteImages } from './sources/artinstitute.js';
import { fetchWikimediaImages } from './sources/wikimedia.js';
import { fetchOpenverseImages } from './sources/openverse.js';
import { fetchMovieStills } from './sources/movies.js';
import * as repo from './images.repository.js';
import { scoreImage } from './scoring.service.js';

export async function fetchAndScoreCandidates() {
  console.log('Fetching new image candidates...');
  
  // 1. Fetch from all enabled sources concurrently
  const fetchPromises = [
    fetchMetMuseumImages().catch(e => { console.error('Met error:', e.message); return []; }),
    fetchArtInstituteImages().catch(e => { console.error('ArtInst error:', e.message); return []; }),
    fetchWikimediaImages().catch(e => { console.error('Wiki error:', e.message); return []; }),
    fetchOpenverseImages().catch(e => { console.error('Openverse error:', e.message); return []; }),
    fetchMovieStills().catch(e => { console.error('Movies error:', e.message); return []; })
  ];

  const results = await Promise.all(fetchPromises);
  const allCandidates = results.flat();
  
  console.log(`Found ${allCandidates.length} raw candidates. Filtering...`);

  // 2. Save new candidates to DB
  const savedIds = [];
  for (const candidate of allCandidates) {
    if (!repo.isUrlAlreadyCandidate(candidate.url)) {
      const saved = repo.saveCandidate({
        image_url: candidate.url,
        source_name: candidate.source,
        title: candidate.title,
        category: candidate.category
      });
      savedIds.push(saved.id);
    }
  }

  console.log(`Saved ${savedIds.length} new candidates. Scoring...`);

  // 3. Score candidates sequentially to avoid memory overload with Sharp
  for (const id of savedIds) {
    const candidate = repo.getCandidateById(id);
    const result = await scoreImage(candidate.image_url, id);
    
    // Add category bonus (famous art and movies get a bump)
    let finalScore = result.score;
    if (['art', 'history', 'paintings', 'cinematic'].includes(candidate.category)) {
       finalScore = Math.min(100, finalScore + 15);
    }

    if (finalScore < 0) {
      repo.updateCandidateStatus(id, 'rejected'); // Image broken or inaccessible
    } else {
      repo.updateCandidateScore(id, finalScore, result.thumbnailPath);
    }
  }

  console.log('Finished fetching and scoring candidates.');
  return repo.getTodayCandidates();
}

export function selectBestCandidate() {
  const candidates = repo.getTodayCandidates().filter(c => c.status === 'candidate');
  if (candidates.length === 0) return null;
  
  // Sort by score and pick the best
  candidates.sort((a, b) => b.quality_score - a.quality_score);
  const best = candidates[0];
  
  repo.updateCandidateStatus(best.id, 'selected');
  return best;
}
