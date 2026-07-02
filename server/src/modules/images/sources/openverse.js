import axios from 'axios';

const SEARCH_TERMS = ['landscape', 'architecture', 'nature', 'cityscape', 'mountain'];

export async function fetchOpenverseImages(limit = 5) {
  try {
    const term = SEARCH_TERMS[new Date().getDay() % SEARCH_TERMS.length];
    
    // Search for CC0/PD photography
    const searchUrl = `https://api.openverse.org/v1/images/?q=${term}&license=cc0,pdm&category=photography&page_size=${limit}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
         'User-Agent': 'ASCIIManBot/1.0'
      }
    });
    
    if (!data.results) return [];

    return data.results.map(item => ({
      url: item.url,
      title: item.title || 'Untitled',
      source: `Openverse (${item.source})`,
      category: 'nature'
    }));
  } catch (error) {
    console.error('Openverse fetch failed:', error.message);
    return [];
  }
}
