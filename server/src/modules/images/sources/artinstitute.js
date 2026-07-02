import axios from 'axios';

const SEARCH_TERMS = ['vincent van gogh', 'claude monet', 'rembrandt', 'portrait', 'landscape'];

export async function fetchArtInstituteImages(limit = 5) {
  try {
    const term = SEARCH_TERMS[new Date().getDay() % SEARCH_TERMS.length];
    
    const searchUrl = `https://api.artic.edu/api/v1/artworks/search?q=${term}&fields=id,title,image_id,artist_display&limit=${limit}`;
    const { data } = await axios.get(searchUrl);
    
    if (!data.data) return [];

    const candidates = [];
    for (const item of data.data) {
      if (item.image_id) {
        candidates.push({
          url: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
          title: `${item.title} by ${item.artist_display || 'Unknown'}`,
          source: 'Art Institute of Chicago',
          category: 'art'
        });
      }
    }

    return candidates;
  } catch (error) {
    console.error('Art Institute fetch failed:', error.message);
    return [];
  }
}
