/**
 * Catálogo de músicas externas em domínio público (`public/audio/music`).
 * Para adicionar uma nova música ou novo boss, basta registrar uma entrada aqui;
 * o `MusicDirector` gerencia pré-carregamento, volume configurável, fades e transições.
 */
const base = (import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/');

export const MUSIC_TRACKS = Object.freeze({
  menu: Object.freeze({
    key: 'music_menu',
    src: [`${base}audio/music/menu_carefree.mp3`],
    loop: true,
    volumeScale: 0.68,
    title: 'Carefree — Kevin MacLeod',
    composer: 'Kevin MacLeod',
    performer: 'Kevin MacLeod',
    license: 'Creative Commons Attribution 3.0',
    requiresAttribution: true,
    commercialUse: true,
    allowsModification: true,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Carefree_(ISRC_USUAN1400037).mp3',
  }),
  stage_normal: Object.freeze({
    key: 'music_stage_normal',
    src: [`${base}audio/music/hitslab-japan-japanese-music-636008.mp3`],
    loop: true,
    volumeScale: 0.82,
    title: 'Sakura Sakura — música folclórica japonesa',
    composer: 'Tradicional japonês',
    performer: 'Kanohara (gravação sintética)',
    license: 'Creative Commons Attribution-ShareAlike 3.0',
    requiresAttribution: true,
    commercialUse: true,
    allowsModification: true,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sakura_Sakura.song.ogg',
  }),
  boss_mini: Object.freeze({
    key: 'music_boss_mini',
    src: [`${base}audio/music/mountain_king.ogg`],
    loop: true,
    volumeScale: 0.95,
    title: 'In the Hall of the Mountain King (Edvard Grieg) — Musopen Symphony Orchestra',
    composer: 'Edvard Grieg (1843–1907)',
    performer: 'Musopen Symphony Orchestra',
    license: 'Public Domain / CC0 1.0',
    requiresAttribution: false,
    commercialUse: true,
    allowsModification: true,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg',
  }),
  boss_final_p1: Object.freeze({
    key: 'music_boss_final_p1',
    src: [`${base}audio/music/beethoven_5th.mp3`],
    loop: true,
    volumeScale: 0.95,
    title: 'Symphony No. 5 in C minor, Op. 67 — I. Allegro con brio (Ludwig van Beethoven)',
    composer: 'Ludwig van Beethoven (1770–1827)',
    performer: 'Gravação sinfônica em domínio público (Internet Archive)',
    license: 'Public Domain Mark 1.0',
    requiresAttribution: false,
    commercialUse: true,
    allowsModification: true,
    sourceUrl: 'https://archive.org/details/beethoven-symphony-no.-5-in-c-minor-op.-67-i.-allegro-con-brio',
  }),
  boss_final_p2: Object.freeze({
    key: 'music_boss_final_p2',
    src: [`${base}audio/music/ride_of_the_valkyries.mp3`],
    loop: true,
    volumeScale: 1.0,
    title: "Ride of the Valkyries (Richard Wagner) — Vessella's Italian Band (LOC Public Domain)",
    composer: 'Richard Wagner (1813–1883)',
    performer: "Vessella's Italian Band (reg. Oreste Vessella)",
    license: 'Public Domain Mark 1.0',
    requiresAttribution: false,
    commercialUse: true,
    allowsModification: true,
    sourceUrl: 'https://archive.org/details/loc-jukebox-134379-ride-of-the-valkyries',
  }),
});

/**
 * Mapeamento configurável de boss (e fase opcional) para faixa musical.
 * Suporta tanto string direta quanto objeto `{ 1: 'track_p1', 2: 'track_p2' }` por fase.
 */
export const BOSS_MUSIC_BY_BOSS_ID = Object.freeze({
  mini_boss_50: 'boss_mini',
  boss_final: Object.freeze({
    1: 'boss_final_p1',
    2: 'boss_final_p2',
  }),
  final_boss: Object.freeze({
    1: 'boss_final_p1',
    2: 'boss_final_p2',
  }),
});
