// Japanese terrestrial / NHK broadcast channel per group-stage fixture.
// Keyed by fixture id (see worldCup2026.ts, e.g. "F-1"). Only matches aired on
// terrestrial TV (NHK総合 / NHK BS / 日本テレビ / フジテレビ) get an entry; the
// DAZN streaming-only matches have none, so the schedule shows a DAZN badge.
//
// Source: footballchannel.jp の地上波放送予定
// (https://www.footballchannel.jp/2026/06/12/post816645/). 追加・修正があれば
// fixture id にチャンネル名を足すだけ。
export const broadcastByFixture: Record<string, string> = {
  'A-1': 'NHK総合', // メキシコ vs 南アフリカ
  'B-1': 'NHK総合', // カナダ vs ボスニア
  'C-2': 'NHK総合', // ハイチ vs スコットランド
  'F-1': 'NHK総合', // オランダ vs 日本
  'A-3': 'NHK総合', // メキシコ vs 韓国
  'D-3': 'NHK総合', // アメリカ vs オーストラリア
  'C-3': 'NHK総合', // ブラジル vs ハイチ
  'F-3': 'NHK総合', // オランダ vs スウェーデン
  'F-4': 'NHK総合・日テレ', // チュニジア vs 日本
  'F-6': 'NHK総合', // 日本 vs スウェーデン
  'D-2': '日テレ', // オーストラリア vs トルコ
  'E-3': '日テレ', // ドイツ vs コートジボワール
  'I-1': 'フジ', // フランス vs セネガル
  'C-4': 'フジ', // スコットランド vs モロッコ
}
