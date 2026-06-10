// Lightweight i18n + timezone settings, shared via an external store so any
// component (and plain functions) can read the current language / timezone and
// re-render on change without prop drilling. Untranslated strings fall back to
// the Japanese source, so partial translations are always safe to ship.
import { useSyncExternalStore } from 'react'
import { teamNamesJa, teams } from '../data/worldCup2026'

export type Lang = 'ja' | 'en' | 'es'

export type TimezoneOption = { value: string; ja: string; en: string; es: string }

// A small, World-Cup-2026-relevant set of timezones (host countries + JP + the
// big Spanish/Portuguese audiences + Europe).
export const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Tokyo', ja: '日本 (JST)', en: 'Japan (JST)', es: 'Japón (JST)' },
  { value: 'America/New_York', ja: 'アメリカ東部 (ET)', en: 'US Eastern (ET)', es: 'EE. UU. Este (ET)' },
  { value: 'America/Chicago', ja: 'アメリカ中部 (CT)', en: 'US Central (CT)', es: 'EE. UU. Centro (CT)' },
  { value: 'America/Denver', ja: 'アメリカ山岳部 (MT)', en: 'US Mountain (MT)', es: 'EE. UU. Montaña (MT)' },
  { value: 'America/Los_Angeles', ja: 'アメリカ西部 (PT)', en: 'US Pacific (PT)', es: 'EE. UU. Pacífico (PT)' },
  { value: 'America/Mexico_City', ja: 'メキシコ', en: 'Mexico City', es: 'Ciudad de México' },
  { value: 'America/Toronto', ja: 'カナダ東部', en: 'Canada Eastern', es: 'Canadá Este' },
  { value: 'Europe/London', ja: 'イギリス', en: 'United Kingdom', es: 'Reino Unido' },
  { value: 'Europe/Madrid', ja: 'スペイン', en: 'Spain', es: 'España' },
  { value: 'America/Argentina/Buenos_Aires', ja: 'アルゼンチン', en: 'Argentina', es: 'Argentina' },
  { value: 'America/Sao_Paulo', ja: 'ブラジル', en: 'Brazil', es: 'Brasil' },
  { value: 'UTC', ja: '協定世界時 (UTC)', en: 'UTC', es: 'UTC' },
]

export const LANG_LABELS: Record<Lang, string> = { ja: '日本語', en: 'English', es: 'Español' }

const LOCALE: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US', es: 'es-ES' }

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  const raw = window.localStorage.getItem(key) as T | null
  return raw && allowed.includes(raw) ? raw : fallback
}

let lang: Lang = readStored('wc-lang', ['ja', 'en', 'es'] as const, 'ja')
let tz: string = (typeof window !== 'undefined' && window.localStorage?.getItem('wc-tz')) || 'Asia/Tokyo'

const listeners = new Set<() => void>()
function emit() {
  for (const listener of listeners) listener()
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function snapshot() {
  return `${lang}|${tz}`
}

export function setLang(next: Lang) {
  lang = next
  try {
    window.localStorage?.setItem('wc-lang', next)
  } catch {
    // ignore storage errors
  }
  emit()
}
export function setTz(next: string) {
  tz = next
  try {
    window.localStorage?.setItem('wc-tz', next)
  } catch {
    // ignore storage errors
  }
  emit()
}
export function getLang(): Lang {
  return lang
}
export function getTz(): string {
  return tz
}

// Subscribe a component to language/timezone changes.
export function useSettings(): { lang: Lang; tz: string } {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return { lang, tz }
}

// Translate a Japanese source string. Missing translations fall back to the
// Japanese text, so the UI is never broken by an incomplete dictionary.
export function useT(): (ja: string) => string {
  const { lang: current } = useSettings()
  return (ja: string) => (current === 'ja' ? ja : dict[current][ja] ?? ja)
}

// Non-hook translate (for code outside React render).
export function translate(ja: string, current: Lang = lang): string {
  return current === 'ja' ? ja : dict[current][ja] ?? ja
}

// Localized country name. EN/ES fall back to the English team name until a full
// localized country map is added.
export function teamName(teamId: string, current: Lang = lang): string {
  if (current === 'ja') return teamNamesJa[teamId] || teamId
  const team = teams.find((entry) => entry.id === teamId)
  return team?.name || teamNamesJa[teamId] || teamId
}

// Kickoff date+time in the chosen timezone and language. Replaces the hard-coded
// "Asia/Tokyo … JST" formatters that used to live in each component.
export function formatKickoff(iso: string | undefined, zone: string = tz, current: Lang = lang): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const base = new Intl.DateTimeFormat(LOCALE[current], {
    timeZone: zone,
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
  return `${base} ${tzAbbrev(zone)}`.trim()
}

export function formatDateShort(dateStr: string, zone: string = tz, current: Lang = lang): string {
  const parsed = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return new Intl.DateTimeFormat(LOCALE[current], { timeZone: zone, month: 'numeric', day: 'numeric', weekday: 'short' }).format(parsed)
}

function tzAbbrev(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date())
    return parts.find((part) => part.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

// Japanese source string -> { en, es }. Add entries here to localize more of the
// player-facing UI. Anything missing renders in Japanese.
const dict: Record<'en' | 'es', Record<string, string>> = {
  en: {
    // nav / sections
    試合: 'Matches',
    組: 'Groups',
    順位: 'Standings',
    予想: 'Forecast',
    救済: 'Rescue',
    ルール: 'Rules',
    組合せ: 'Bracket',
    使い方: 'How to play',
    ルーム対戦: 'Rooms',
    ルーム: 'Room',
    みんなで遊ぶ: 'Play together',
    // rooms entry
    ニックネーム: 'Nickname',
    表示名: 'Display name',
    ルーム名: 'Room name',
    合言葉: 'Passphrase',
    '空欄なら誰でも参加可': 'Leave blank for open join',
    'ルームを作成': 'Create room',
    'ルームに参加': 'Join room',
    作成: 'Create',
    参加: 'Join',
    '人数（最大）': 'Players (max)',
    '1人の選択数': 'Picks per player',
    'ニックネームとルーム名を入力してください': 'Enter a nickname and a room name',
    // lobby / picking / reveal
    待機中: 'Waiting',
    'ピックを開始': 'Start picking',
    公開してルーレット: 'Reveal & roulette',
    '配点調整': 'Scoring settings',
    'ホストのみ編集': 'Host can edit',
    閲覧のみ: 'View only',
    保存中: 'Saving',
    保存済み: 'Saved',
    保存失敗: 'Save failed',
    // board
    参加者ランキング: 'Player ranking',
    総合ポイント: 'Total points',
    最終予想グラフ: 'Final forecast',
    'グループ': 'Group',
    '試合・結果': 'Matches & results',
    持ち主未定: 'No owner yet',
    決勝T進出: 'Advanced to knockout',
    試合前: 'Upcoming',
    終了: 'Final',
    引分: 'Draw',
    // rules editor
    勝ち: 'Win',
    PK勝ち: 'PK win',
    '3点差勝ち': '3+ goal win',
    ハットトリック: 'Hat-trick',
    '3位': '3rd place',
    準優勝: 'Runner-up',
    優勝: 'Champion',
    全敗: 'All losses',
    得点王: 'Top scorer',
    '黄4枚': '4 yellows',
    赤: 'Red card',
    日本倍率: 'Japan multiplier',
    最初から再計算: 'Recompute from start',
    変えた時から: 'From this change on',
    過去も含め全試合を新しい配点で計算し直す: 'Recompute every match with the new scoring',
    'これから始まる試合だけ新しい配点（過去は固定）': 'Only upcoming matches use the new scoring (past is locked)',
    配点を適用: 'Apply scoring',
    オッズ倍率を適用: 'Apply odds multiplier',
    // misc
    閉じる: 'Close',
    次戦: 'Next',
    過去W杯: 'Past World Cups',
    ハイライト: 'Highlights',
    ニュース: 'News',
    言語: 'Language',
    タイムゾーン: 'Timezone',
    ルームを作る: 'Create a room',
    参加する: 'Join',
    'ルームコード': 'Room code',
    '合言葉 (任意)': 'Passphrase (optional)',
    '合言葉 (必要なら)': 'Passphrase (if any)',
    '例: 金曜ドラフト': 'e.g. Friday Draft',
    '6文字のコード': '6-character code',
    '設定されている場合のみ': 'Only if one is set',
    'ルームコードとニックネームを入力してください': 'Enter a room code and a nickname',
    'ルームを作成できませんでした': 'Could not create the room',
    '参加できませんでした': 'Could not join',
    '待機中…': 'Waiting…',
    'コードを共有して仲間を集めましょう。': 'Share the code to gather your group.',
    '被り3人以上はなし': 'No 3-way collisions',
    'このルームの配点です。変更できるのはルームのホストだけです。': 'These are this room’s scoring rules. Only the host can change them.',
  },
  es: {
    試合: 'Partidos',
    組: 'Grupos',
    順位: 'Clasificación',
    予想: 'Pronóstico',
    救済: 'Rescate',
    ルール: 'Reglas',
    組合せ: 'Eliminatorias',
    使い方: 'Cómo jugar',
    ルーム対戦: 'Salas',
    ルーム: 'Sala',
    みんなで遊ぶ: 'Jugar juntos',
    ニックネーム: 'Apodo',
    表示名: 'Nombre',
    ルーム名: 'Nombre de la sala',
    合言葉: 'Contraseña',
    '空欄なら誰でも参加可': 'Vacío = entrada libre',
    'ルームを作成': 'Crear sala',
    'ルームに参加': 'Unirse',
    作成: 'Crear',
    参加: 'Unirse',
    '人数（最大）': 'Jugadores (máx.)',
    '1人の選択数': 'Países por jugador',
    'ニックネームとルーム名を入力してください': 'Escribe un apodo y un nombre de sala',
    待機中: 'Esperando',
    'ピックを開始': 'Empezar a elegir',
    公開してルーレット: 'Revelar y ruleta',
    '配点調整': 'Ajustes de puntos',
    'ホストのみ編集': 'Solo el anfitrión edita',
    閲覧のみ: 'Solo lectura',
    保存中: 'Guardando',
    保存済み: 'Guardado',
    保存失敗: 'Error al guardar',
    参加者ランキング: 'Ranking de jugadores',
    総合ポイント: 'Puntos totales',
    最終予想グラフ: 'Pronóstico final',
    'グループ': 'Grupo',
    '試合・結果': 'Partidos y resultados',
    持ち主未定: 'Sin dueño',
    決勝T進出: 'Pasa a eliminatorias',
    試合前: 'Próximo',
    終了: 'Final',
    引分: 'Empate',
    勝ち: 'Victoria',
    PK勝ち: 'Victoria por penales',
    '3点差勝ち': 'Victoria por 3+',
    ハットトリック: 'Triplete',
    '3位': '3er puesto',
    準優勝: 'Subcampeón',
    優勝: 'Campeón',
    全敗: 'Todas perdidas',
    得点王: 'Goleador',
    '黄4枚': '4 amarillas',
    赤: 'Roja',
    日本倍率: 'Multiplicador Japón',
    最初から再計算: 'Recalcular desde el inicio',
    変えた時から: 'Desde este cambio',
    過去も含め全試合を新しい配点で計算し直す: 'Recalcular todos los partidos con los nuevos puntos',
    'これから始まる試合だけ新しい配点（過去は固定）': 'Solo los próximos partidos usan los nuevos puntos (lo pasado queda fijo)',
    配点を適用: 'Aplicar puntos',
    オッズ倍率を適用: 'Aplicar multiplicador de cuotas',
    閉じる: 'Cerrar',
    次戦: 'Próximo',
    過去W杯: 'Mundiales anteriores',
    ハイライト: 'Resúmenes',
    ニュース: 'Noticias',
    言語: 'Idioma',
    タイムゾーン: 'Zona horaria',
    ルームを作る: 'Crear una sala',
    参加する: 'Unirse',
    'ルームコード': 'Código de sala',
    '合言葉 (任意)': 'Contraseña (opcional)',
    '合言葉 (必要なら)': 'Contraseña (si hay)',
    '例: 金曜ドラフト': 'ej. Draft del viernes',
    '6文字のコード': 'Código de 6 letras',
    '設定されている場合のみ': 'Solo si está configurada',
    'ルームコードとニックネームを入力してください': 'Escribe un código de sala y un apodo',
    'ルームを作成できませんでした': 'No se pudo crear la sala',
    '参加できませんでした': 'No se pudo unir',
    '待機中…': 'Esperando…',
    'コードを共有して仲間を集めましょう。': 'Comparte el código para reunir a tu grupo.',
    '被り3人以上はなし': 'Sin choques de 3+',
    'このルームの配点です。変更できるのはルームのホストだけです。': 'Estos son los puntos de la sala. Solo el anfitrión puede cambiarlos.',
  },
}
