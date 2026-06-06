// Defensive LINE LIFF bridge. The SDK is only loaded from the CDN when a LIFF
// ID is actually configured on the backend (/api/bootstrap). Outside of LINE,
// or on the static build with no backend, every export resolves to a safe
// no-op so the board still works in a normal browser.

export type LineProfile = {
  userId: string
  displayName: string
  pictureUrl?: string
}

type LiffSdk = {
  init: (config: { liffId: string }) => Promise<void>
  isLoggedIn: () => boolean
  login: (config?: { redirectUri?: string }) => void
  isInClient: () => boolean
  getProfile: () => Promise<LineProfile>
}

declare global {
  interface Window {
    liff?: LiffSdk
  }
}

const LIFF_SDK_URL = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
let sdkPromise: Promise<LiffSdk | null> | null = null

function loadSdk(): Promise<LiffSdk | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.liff) return Promise.resolve(window.liff)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<LiffSdk | null>((resolve) => {
    const script = document.createElement('script')
    script.src = LIFF_SDK_URL
    script.async = true
    script.onload = () => resolve(window.liff ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return sdkPromise
}

let initialized = false

export async function ensureLiff(liffId: string | null | undefined): Promise<LiffSdk | null> {
  if (!liffId) return null
  const sdk = await loadSdk()
  if (!sdk) return null
  if (!initialized) {
    try {
      await sdk.init({ liffId })
      initialized = true
    } catch {
      return null
    }
  }
  return sdk
}

export async function getLineProfile(liffId: string | null | undefined): Promise<LineProfile | null> {
  const sdk = await ensureLiff(liffId)
  if (!sdk) return null
  try {
    if (!sdk.isLoggedIn()) {
      // Only redirect to login when running inside the LINE app, so a plain
      // browser visit never gets bounced to a login screen.
      if (sdk.isInClient()) sdk.login()
      return null
    }
    return await sdk.getProfile()
  } catch {
    return null
  }
}
