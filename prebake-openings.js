// Run once: npm install dotenv  then  node prebake-openings.js
require('dotenv').config();
const https = require('https');
const fs = require('fs');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY || API_KEY === 'YOUR_KEY_HERE') {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env');
  process.exit(1);
}

const RESTAURANTS = [
  { name: 'Shiok Singapore Kitchen', location: 'Menlo Park',    section: 'New Openings — March & April 2026',      highlights: 'Authentic Singaporean street food like chili crab and laksa.',                          websiteUrl: 'https://shiokkitchen.com' },
  { name: 'Yutori',                  location: 'Palo Alto',     section: 'New Openings — March & April 2026',      highlights: 'A Japanese multi-concept space with a cafe, market, and bar.',                         websiteUrl: 'https://yutori-pa.com' },
  { name: 'MIXT',                    location: 'San Mateo',     section: 'New Openings — March & April 2026',      highlights: 'Health-focused salads and grain bowls in downtown San Mateo.',                         websiteUrl: 'https://mixt.com' },
  { name: 'Amado',                   location: 'Burlingame',    section: 'New Openings — March & April 2026',      highlights: 'Contemporary Mexican cuisine from the Dominguez restaurant family.',                    websiteUrl: 'https://amadoburlingame.com' },
  { name: 'Hibari',                  location: 'Portola Valley',section: 'Recent Notable Debuts — Winter 2026',    highlights: 'Upscale sushi and Japanese craftsmanship in Ladera Country Shopper.',                  websiteUrl: 'https://hibariportolavalley.com' },
  { name: "Sana'a Cafe",             location: 'Redwood City',  section: 'Recent Notable Debuts — Winter 2026',    highlights: 'Traditional Yemeni coffee and spiced pastries.',                                      websiteUrl: 'https://sanaacafe.com' },
  { name: 'Zaytinya',                location: 'Palo Alto',     section: 'Recent Notable Debuts — Winter 2026',    highlights: 'Mediterranean mezze from Chef José Andrés at Stanford Shopping Center.',              websiteUrl: 'https://zaytinya.com' },
  { name: 'Café Vivant',             location: 'Menlo Park',    section: 'Recent Notable Debuts — Winter 2026',    highlights: 'French-inspired bistro and wine bar.',                                                websiteUrl: 'https://cafevivantca.com' },
];

function searchPlace(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ textQuery: query });
    const options = {
      hostname: 'places.googleapis.com',
      path: '/v1/places:searchText',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.photos,places.websiteUri,places.id',
        'Referer': 'https://outside-eats.com/',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Bad JSON: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const results = [];

  for (const r of RESTAURANTS) {
    console.log(`Fetching: ${r.name}, ${r.location}...`);
    try {
      const res = await searchPlace(`${r.name} ${r.location} CA`);
const place = res.places && res.places[0];
      let photoUrl = null;
      let placeId = null;

      if (place) {
        placeId = place.id || null;
        if (place.photos && place.photos.length > 0) {
          const photoName = place.photos[0].name;
          photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${API_KEY}`;
        }
      } else {
        console.warn(`  No results found for ${r.name}`);
      }

      results.push({ name: r.name, location: r.location, section: r.section, highlights: r.highlights, websiteUrl: r.websiteUrl, placeId, photoUrl });
    } catch (err) {
      console.error(`  Error fetching ${r.name}:`, err.message);
      results.push({ name: r.name, location: r.location, section: r.section, highlights: r.highlights, websiteUrl: r.websiteUrl, placeId: null, photoUrl: null });
    }
  }

  const output = `var OPENINGS_DATA = ${JSON.stringify(results, null, 2)};\n`;
  fs.writeFileSync('openings-data.js', output);
  console.log('\nDone — written openings-data.js');
}

main();
