/**
 * Song ids. A Spotify song has Spotify's own 22-character id. A song that
 * only exists on YouTube gets "yt-" and its 11-character video id, so every
 * place that keeps a song's data (games, saved lists, lyrics) works for both.
 */
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const OWN_ID = /^yt-[\w-]{11}$/;

export const isSpotifyId = (id: string): boolean => SPOTIFY_ID.test(id);
export const isOwnId = (id: string): boolean => OWN_ID.test(id);
export const isTrackId = (id: string): boolean => isSpotifyId(id) || isOwnId(id);

export const ownIdFor = (videoId: string): string => `yt-${videoId}`;
