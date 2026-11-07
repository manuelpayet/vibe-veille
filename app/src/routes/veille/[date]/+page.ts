import { fetchIndex, fetchVeille } from '#lib/api.js';
import type { PageLoad } from './$types';

// ssr=false : ce load s'exécute côté client, au premier chargement comme
// à chaque navigation client vers /veille/<date>.
export const load: PageLoad = async ({ params }) => {
  const index = await fetchIndex();
  const entry = index.veilles.find((v) => v.date === params.date);
  const veille = entry ? await fetchVeille(entry.file) : null;
  return { veille, notFound: !entry, date: params.date };
};
