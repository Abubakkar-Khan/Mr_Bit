import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchMovieStills() {
  try {
    const candidates = [];
    
    for (let i = 0; i < 3; i++) {
        const res = await axios.get('https://film-grab.com/?random');
        const $ = cheerio.load(res.data);
        
        const title = $('h1.entry-title').text().trim() || 'Cinematic Shot';
        
        const images = $('img').toArray();
        let highResUrl = null;
        
        for (const img of images) {
            let src = $(img).attr('src');
            if (!src) continue;
            
            // Look for actual still images, avoiding UI elements/thumbnails
            if (src.includes('wp-content/uploads') && src.endsWith('.jpg')) {
                // Try to get the original high-res image by stripping dimensions
                src = src.replace(/-\d+x\d+\.jpg$/, '.jpg');
                highResUrl = src;
                break;
            }
        }
        
        if (highResUrl) {
            candidates.push({
                url: highResUrl,
                title: title,
                source: 'FilmGrab',
                category: 'cinematic'
            });
        }
    }
    
    return candidates;
  } catch (error) {
    console.error('Error fetching movie stills:', error.message);
    return [];
  }
}
