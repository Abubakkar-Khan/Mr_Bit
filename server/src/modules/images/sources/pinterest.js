import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger, LogStage } from '../../logger/logger.service.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Fetch pins from Pinterest using the internal BaseSearchResource API
 */
async function fetchPinsViaApi(query, pageSize = 30) {
  const dataPayload = {
    options: {
      query,
      scope: 'pins',
      page_size: pageSize,
      filters: null
    },
    context: {}
  };

  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(`/search/pins/?q=${query}`)}&data=${encodeURIComponent(JSON.stringify(dataPayload))}`;

  const response = await axios.get(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/json, text/javascript, */*, q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    },
    timeout: 10000
  });

  const results = response.data?.resource_response?.data?.results || [];
  return results;
}

/**
 * Fallback: Fetch pins by scraping Pinterest search page HTML and parsing initial JSON data
 */
async function fetchPinsViaHtml(query) {
  const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
  
  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 12000
  });

  const $ = cheerio.load(response.data);
  let pins = [];

  // Inspect __PWS_DATA__ or initial-data script
  const pwsScript = $('script#__PWS_DATA__').html();
  if (pwsScript) {
    try {
      const parsed = JSON.parse(pwsScript);
      const feeds = parsed?.props?.initialReduxState?.feed || {};
      for (const key of Object.keys(feeds)) {
        if (Array.isArray(feeds[key])) {
          pins.push(...feeds[key]);
        }
      }
    } catch (e) {
      logger.debug(LogStage.SCRAPE, `PWS_DATA parse error: ${e.message}`);
    }
  }

  // Also check general script tags for pin patterns if needed
  if (pins.length === 0) {
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('resource_response') && content.includes('results')) {
        try {
          const match = content.match(/"results":\s*(\[.*?\])/s);
          if (match && match[1]) {
            const parsedResults = JSON.parse(match[1]);
            if (Array.isArray(parsedResults)) {
              pins.push(...parsedResults);
            }
          }
        } catch {
          // ignore regex json failures
        }
      }
    });
  }

  return pins;
}

/**
 * Main Pinterest Discovery function
 * Queries Pinterest for a list of topics/queries and normalizes candidate image objects
 */
export async function fetchPinterestTrendingArt(queries = ['digital art trending', 'concept art'], options = {}) {
  const allPins = [];
  logger.info(LogStage.SCRAPE, `Starting Pinterest discovery for ${queries.length} query topics: [${queries.join(', ')}]`);

  for (const query of queries) {
    logger.debug(LogStage.SCRAPE, `Querying Pinterest for "${query}"...`);
    let rawPins = [];

    try {
      rawPins = await fetchPinsViaApi(query, options.pageSize || 30);
      logger.debug(LogStage.SCRAPE, `API returned ${rawPins.length} pins for "${query}"`);
    } catch (apiErr) {
      logger.warn(LogStage.SCRAPE, `Pinterest API failed for "${query}": ${apiErr.message}. Trying HTML fallback...`);
      try {
        rawPins = await fetchPinsViaHtml(query);
        logger.debug(LogStage.SCRAPE, `HTML scraper returned ${rawPins.length} pins for "${query}"`);
      } catch (htmlErr) {
        logger.error(LogStage.SCRAPE, `Both API and HTML failed for "${query}": ${htmlErr.message}`);
      }
    }

    // Normalize each pin
    for (const pin of rawPins) {
      if (!pin) continue;

      // Extract image specifications
      const images = pin.images || {};
      const orig = images.orig || images['736x'] || images['564x'] || images['474x'];
      if (!orig || !orig.url) continue;

      // Prefer 736x or orig URL, but guard against massive files
      let imageUrl = orig.url;
      let width = orig.width || 0;
      let height = orig.height || 0;

      // If only thumbnail exists (236x), upgrade URL to 736x
      if (imageUrl.includes('/236x/')) {
        imageUrl = imageUrl.replace('/236x/', '/736x/');
      }

      // Extract saves / repins
      const saves = pin.repin_count || 
                    pin.aggregated_pin_data?.aggregated_stats?.saves || 
                    pin.save_count || 
                    0;

      const title = pin.grid_title || pin.title || pin.description || `Pinterest Art Pin #${pin.id || Date.now()}`;

      allPins.push({
        id: pin.id || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        source: 'pinterest',
        query,
        category: 'art',
        title: title.slice(0, 140),
        url: imageUrl,
        saves_count: Number(saves) || 0,
        width: Number(width) || 0,
        height: Number(height) || 0,
        pin_url: pin.id ? `https://www.pinterest.com/pin/${pin.id}/` : null
      });
    }

    // Small courteous pause between queries
    await new Promise((r) => setTimeout(r, 600));
  }

  // Deduplicate by URL
  const seenUrls = new Set();
  const uniquePins = [];
  for (const p of allPins) {
    if (!seenUrls.has(p.url)) {
      seenUrls.add(p.url);
      uniquePins.push(p);
    }
  }

  logger.info(LogStage.SCRAPE, `Pinterest discovery completed. Harvested ${uniquePins.length} unique pins.`);
  return uniquePins;
}
