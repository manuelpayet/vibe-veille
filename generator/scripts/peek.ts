// Sonde de debug : essaie des URLs candidates et affiche statut + extrait + parse OK/ECHEC.
// Usage : npx tsx scripts/peek.ts <url1> <url2> ...
import { fetchText } from '../src/http.js';
import { parseFeed } from '../src/sources/rss.js';

for (const url of process.argv.slice(2)) {
  try {
    const txt = await fetchText(url);
    let parsed = 'ECHEC';
    try {
      const items = parseFeed(txt);
      parsed = `OK (${items.length} items, ex: ${items[0]?.title?.slice(0, 50) ?? '-'})`;
    } catch {
      /* non parsable */
    }
    console.log(`${url}\n  -> ${txt.length} octets, parse: ${parsed}, début: ${txt.slice(0, 120).replace(/\s+/g, ' ')}`);
  } catch (err) {
    console.log(`${url}\n  -> ERREUR ${(err as Error).message}`);
  }
}
