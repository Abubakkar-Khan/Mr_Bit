import axios from 'axios';

const CATEGORIES = [
  'Category:Featured_pictures_of_landscapes',
  'Category:Featured_pictures_of_architecture',
  'Category:Featured_pictures_of_places',
  'Category:Featured_pictures_of_historical_sites',
];

export async function fetchWikimediaImages(limit = 5) {
  try {
    const category = CATEGORIES[new Date().getDay() % CATEGORIES.length];
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${category}&cmtype=file&cmlimit=${limit * 2}&format=json`;
    const { data: searchData } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'ASCIIManBot/1.0 (contact@example.com)' }
    });
    
    if (!searchData.query?.categorymembers) return [];

    const fileNames = searchData.query.categorymembers
      .map(m => m.title)
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);

    if (fileNames.length === 0) return [];

    // Get image info (URL)
    const titlesParam = fileNames.map(encodeURIComponent).join('|');
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url|extmetadata&format=json`;
    
    const { data: infoData } = await axios.get(infoUrl, {
        headers: { 'User-Agent': 'ASCIIManBot/1.0 (contact@example.com)' }
    });

    const candidates = [];
    const pages = infoData.query.pages;
    
    for (const pageId in pages) {
      const page = pages[pageId];
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        let title = page.title.replace('File:', '').split('.')[0].replace(/_/g, ' ');
        candidates.push({
          url: info.url,
          title: title,
          source: 'Wikimedia Commons',
          category: 'nature' // general bucket
        });
      }
    }

    return candidates;
  } catch (error) {
    console.error('Wikimedia fetch failed:', error.message);
    return [];
  }
}
