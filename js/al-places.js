/* ============================================================
   F1 TAXI — al-places.js
   Curated dataset of real Albanian (and Kosovo) locations with
   approximate real coordinates, used for instant autocomplete
   suggestions in the fare calculator. Live OpenStreetMap search
   still runs on top for full street-level coverage.
   Coordinates are place/centre points (decimal degrees).
   ============================================================ */
window.AL_PLACES = [
  /* --- Airport & Tirana --- */
  { name: 'Aeroporti Nënë Tereza (Rinas)', area: 'Tiranë', lat: 41.4147, lon: 19.7206, type: 'poi' },
  { name: 'Tiranë (Qendër)', area: 'Shqipëri', lat: 41.3275, lon: 19.8189, type: 'city' },
  { name: 'Sheshi Skënderbej', area: 'Tiranë', lat: 41.3281, lon: 19.8187, type: 'poi' },
  { name: 'Sheshi Nënë Tereza', area: 'Tiranë', lat: 41.3186, lon: 19.8206, type: 'poi' },
  { name: 'Bulevardi Dëshmorët e Kombit', area: 'Tiranë', lat: 41.3230, lon: 19.8190, type: 'street' },
  { name: 'Blloku', area: 'Tiranë', lat: 41.3199, lon: 19.8155, type: 'poi' },
  { name: 'Rruga e Kavajës', area: 'Tiranë', lat: 41.3260, lon: 19.8050, type: 'street' },
  { name: 'Rruga e Durrësit', area: 'Tiranë', lat: 41.3305, lon: 19.8130, type: 'street' },
  { name: 'Rruga e Elbasanit', area: 'Tiranë', lat: 41.3080, lon: 19.8290, type: 'street' },
  { name: 'Rruga e Dibrës', area: 'Tiranë', lat: 41.3400, lon: 19.8250, type: 'street' },
  { name: 'Rruga Myslym Shyri', area: 'Tiranë', lat: 41.3245, lon: 19.8130, type: 'street' },
  { name: 'Pazari i Ri', area: 'Tiranë', lat: 41.3283, lon: 19.8256, type: 'poi' },
  { name: 'Zogu i Zi', area: 'Tiranë', lat: 41.3339, lon: 19.8106, type: 'poi' },
  { name: 'Kombinat', area: 'Tiranë', lat: 41.3167, lon: 19.7833, type: 'poi' },
  { name: 'Kamëz', area: 'Tiranë', lat: 41.3808, lon: 19.7603, type: 'city' },
  { name: 'Astir', area: 'Tiranë', lat: 41.3210, lon: 19.7850, type: 'poi' },
  { name: 'Yzberish', area: 'Tiranë', lat: 41.3260, lon: 19.7770, type: 'poi' },
  { name: '21 Dhjetori', area: 'Tiranë', lat: 41.3280, lon: 19.7930, type: 'poi' },
  { name: 'Qyteti Studenti', area: 'Tiranë', lat: 41.3050, lon: 19.8230, type: 'poi' },
  { name: 'Parku i Madh (Liqeni Artificial)', area: 'Tiranë', lat: 41.3106, lon: 19.8258, type: 'poi' },
  { name: 'Universiteti i Tiranës', area: 'Tiranë', lat: 41.3186, lon: 19.8206, type: 'poi' },
  { name: 'Fresku', area: 'Tiranë', lat: 41.3450, lon: 19.8360, type: 'poi' },

  /* --- Coast & major cities --- */
  { name: 'Durrës', area: 'Shqipëri', lat: 41.3113, lon: 19.4448, type: 'city' },
  { name: 'Plazhi i Durrësit', area: 'Durrës', lat: 41.2925, lon: 19.4530, type: 'poi' },
  { name: 'Gjiri i Lalëzit', area: 'Durrës', lat: 41.4183, lon: 19.4642, type: 'poi' },
  { name: 'Golem', area: 'Kavajë', lat: 41.2436, lon: 19.5233, type: 'poi' },
  { name: 'Kavajë', area: 'Shqipëri', lat: 41.1858, lon: 19.5561, type: 'city' },
  { name: 'Divjakë', area: 'Shqipëri', lat: 40.9931, lon: 19.5386, type: 'city' },
  { name: 'Lushnjë', area: 'Shqipëri', lat: 40.9419, lon: 19.7050, type: 'city' },
  { name: 'Fier', area: 'Shqipëri', lat: 40.7256, lon: 19.5567, type: 'city' },
  { name: 'Vlorë', area: 'Shqipëri', lat: 40.4686, lon: 19.4914, type: 'city' },
  { name: 'Radhimë', area: 'Vlorë', lat: 40.3567, lon: 19.4286, type: 'poi' },
  { name: 'Orikum', area: 'Vlorë', lat: 40.3272, lon: 19.4708, type: 'city' },
  { name: 'Dhërmi', area: 'Himarë', lat: 40.1500, lon: 19.6428, type: 'poi' },
  { name: 'Palasë (Green Coast)', area: 'Himarë', lat: 40.1839, lon: 19.6008, type: 'poi' },
  { name: 'Himarë', area: 'Shqipëri', lat: 40.1000, lon: 19.7447, type: 'city' },
  { name: 'Borsh', area: 'Sarandë', lat: 40.0592, lon: 19.8558, type: 'poi' },
  { name: 'Sarandë', area: 'Shqipëri', lat: 39.8753, lon: 20.0050, type: 'city' },
  { name: 'Ksamil', area: 'Sarandë', lat: 39.7683, lon: 20.0011, type: 'poi' },
  { name: 'Butrint', area: 'Sarandë', lat: 39.7456, lon: 20.0206, type: 'poi' },

  /* --- Inland & north --- */
  { name: 'Krujë', area: 'Shqipëri', lat: 41.5092, lon: 19.7931, type: 'city' },
  { name: 'Laç', area: 'Kurbin', lat: 41.6353, lon: 19.7133, type: 'city' },
  { name: 'Lezhë', area: 'Shqipëri', lat: 41.7836, lon: 19.6436, type: 'city' },
  { name: 'Shëngjin', area: 'Lezhë', lat: 41.8125, lon: 19.5936, type: 'poi' },
  { name: 'Shkodër', area: 'Shqipëri', lat: 42.0693, lon: 19.5033, type: 'city' },
  { name: 'Velipojë', area: 'Shkodër', lat: 41.8792, lon: 19.4022, type: 'poi' },
  { name: 'Theth', area: 'Shkodër', lat: 42.3928, lon: 19.7681, type: 'poi' },
  { name: 'Vau i Dejës', area: 'Shkodër', lat: 42.0025, lon: 19.6403, type: 'city' },
  { name: 'Kukës', area: 'Shqipëri', lat: 42.0769, lon: 20.4219, type: 'city' },
  { name: 'Bajram Curri', area: 'Tropojë', lat: 42.3567, lon: 20.0761, type: 'city' },
  { name: 'Valbonë', area: 'Tropojë', lat: 42.4108, lon: 19.8917, type: 'poi' },
  { name: 'Peshkopi', area: 'Dibër', lat: 41.6850, lon: 20.4300, type: 'city' },
  { name: 'Burrel', area: 'Mat', lat: 41.6100, lon: 20.0089, type: 'city' },
  { name: 'Rrëshen', area: 'Mirditë', lat: 41.7669, lon: 19.8778, type: 'city' },

  /* --- Central & east --- */
  { name: 'Elbasan', area: 'Shqipëri', lat: 41.1113, lon: 20.0822, type: 'city' },
  { name: 'Librazhd', area: 'Elbasan', lat: 41.1817, lon: 20.3153, type: 'city' },
  { name: 'Pogradec', area: 'Shqipëri', lat: 40.9017, lon: 20.6528, type: 'city' },
  { name: 'Korçë', area: 'Shqipëri', lat: 40.6175, lon: 20.7803, type: 'city' },
  { name: 'Ersekë', area: 'Kolonjë', lat: 40.3339, lon: 20.6786, type: 'city' },
  { name: 'Bilisht', area: 'Devoll', lat: 40.6294, lon: 20.9906, type: 'city' },

  /* --- South --- */
  { name: 'Berat', area: 'Shqipëri', lat: 40.7047, lon: 19.9497, type: 'city' },
  { name: 'Ballsh', area: 'Mallakastër', lat: 40.5936, lon: 19.7361, type: 'city' },
  { name: 'Patos', area: 'Fier', lat: 40.6828, lon: 19.6183, type: 'city' },
  { name: 'Tepelenë', area: 'Shqipëri', lat: 40.2953, lon: 20.0175, type: 'city' },
  { name: 'Përmet', area: 'Shqipëri', lat: 40.2364, lon: 20.3517, type: 'city' },
  { name: 'Gjirokastër', area: 'Shqipëri', lat: 40.0758, lon: 20.1389, type: 'city' },
  { name: 'Delvinë', area: 'Shqipëri', lat: 39.9497, lon: 20.0972, type: 'city' },

  /* --- Kosovo --- */
  { name: 'Prishtinë', area: 'Kosovë', lat: 42.6629, lon: 21.1655, type: 'city' },
  { name: 'Prizren', area: 'Kosovë', lat: 42.2139, lon: 20.7397, type: 'city' }
];
