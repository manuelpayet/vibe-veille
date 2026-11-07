// SPA pure : le contenu (data/*.json) est chargé côté client.
// prerender=false globalement (route dynamique /veille/[date] servie via le fallback 404.html) ;
// les routes statiques / et /historique remettent prerender=true individuellement.
export const ssr = false;
export const prerender = false;
