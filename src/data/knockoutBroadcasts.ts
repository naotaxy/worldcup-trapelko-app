// 2026 W杯 決勝トーナメント(ラウンド32以降)の日本向け放送(目安)。
//
// DAZN が全104試合をライブ/見逃し配信。地上波(NHK総合/日テレ/フジ)とNHK BS(BSP4K)は
// 下表のとおり。出典は Goal.com の全試合テレビ放送ガイド・JFA・footballchannel.jp を統合。
// 地上波の割り当ては進出チーム(特に日本)により変わるため「目安」。確定後はここを編集するだけ。
//
// キーは日本時間(JST)の "MM/DD HH:mm"。各試合の実キックオフ時刻(ESPN)からJSTキーを作って引く。
// 該当が無ければ DAZN(全試合配信)を返す。
export const knockoutBroadcastByJst: Record<string, string> = {
  // ラウンド32
  '06/29 04:00': 'NHK総合',
  '06/30 02:00': 'フジ',
  '06/30 10:00': 'NHK総合',
  '07/01 02:00': '日テレ',
  '07/01 06:00': 'フジ',
  '07/01 10:00': 'NHK総合',
  '07/02 01:00': 'フジ',
  '07/02 05:00': 'NHK総合',
  '07/02 09:00': 'NHK総合',
  '07/03 04:00': 'NHK総合',
  '07/03 08:00': '日テレ',
  '07/03 12:00': 'NHK総合',
  '07/04 03:00': 'NHK総合',
  '07/04 07:00': '日テレ',
  // ラウンド16
  '07/05 02:00': 'NHK BS',
  '07/05 06:00': '日テレ',
  '07/06 05:00': 'NHK BS',
  '07/06 09:00': 'NHK BS',
  '07/07 04:00': '日テレ',
  '07/07 09:00': 'NHK BS',
  '07/08 01:00': 'NHK BS',
  '07/08 05:00': 'NHK BS',
  // 準々決勝
  '07/10 05:00': 'NHK BS',
  '07/11 04:00': 'NHK BS',
  '07/12 06:00': 'NHK BS',
  '07/12 10:00': 'NHK BS',
  // 準決勝
  '07/15 04:00': 'NHK BS',
  '07/16 04:00': 'NHK BS',
  // 3位決定戦・決勝
  '07/19 06:00': 'NHK総合',
  '07/20 04:00': 'NHK総合',
}

const jstKeyFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tokyo',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// 実キックオフ(ISO文字列)から日本の放送局を返す。地上波/BS該当なしは 'DAZN'。
export function knockoutChannelForKickoff(iso: string | undefined | null): string {
  if (!iso) return 'DAZN'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'DAZN'
  const parts = jstKeyFormat.formatToParts(date)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || ''
  const key = `${pick('month')}/${pick('day')} ${pick('hour')}:${pick('minute')}`
  return knockoutBroadcastByJst[key] || 'DAZN'
}
