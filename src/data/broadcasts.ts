// Japanese terrestrial / NHK broadcast channel per group-stage fixture.
// Keyed by fixture id (see worldCup2026.ts, e.g. "F-1"). Only matches aired on
// terrestrial TV (NHK総合 / NHK BS / 日本テレビ / フジテレビ) get an entry; the
// DAZN streaming-only matches have none, so no channel badge is shown for them.
//
// This is filled from the official broadcast schedule. Add/adjust entries as the
// channels are confirmed.
export const broadcastByFixture: Record<string, string> = {
  // 'F-1': 'NHK総合',
  // 'F-6': '日本テレビ',
}
