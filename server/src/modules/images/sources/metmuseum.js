import axios from 'axios';

const SEARCH_TERMS = ['painting', 'landscape', 'portrait', 'sculpture', 'architecture'];

export async function fetchMetMuseumImages(limit = 5) {
  try {
    const term = SEARCH_TERMS[new Date().getDay() % SEARCH_TERMS.length];
    
    // 1. Search for public domain artworks with images
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${term}&hasImages=true&isPublicDomain=true`;
    const { data: searchData } = await axios.get(searchUrl);
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) return [];

    // Shuffle and pick a few IDs
    const shuffledIds = searchData.objectIDs.sort(() => 0.5 - Math.random()).slice(0, limit);
    const candidates = [];

    // 2. Fetch object details to get the image URL
    for (const id of shuffledIds) {
      const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
      const { data: objData } = await axios.get(objUrl);
      
      if (objData.primaryImage) {
        candidates.push({
          url: objData.primaryImage,
          title: objData.title || 'Untitled',
          source: 'Metropolitan Museum of Art',
          category: 'art'
        });
      }
    }

    return candidates;
  } catch (error) {
    console.error('Met Museum fetch failed:', error.message);
    return [];
  }
}
