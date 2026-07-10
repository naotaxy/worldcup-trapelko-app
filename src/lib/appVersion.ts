const runningBundleMatch = /\/assets\/(index-[A-Za-z0-9_-]+\.js)(?:[?#].*)?$/.exec(import.meta.url)

export const RUNNING_BUNDLE = runningBundleMatch?.[1] ?? ''

export async function isNewBundleAvailable(): Promise<boolean> {
  try {
    if (!RUNNING_BUNDLE) return false
    const res = await fetch('/', { cache: 'no-store' })
    if (!res.ok) return false
    const html = await res.text()
    const nextBundle = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html)?.[1]
    return Boolean(nextBundle && nextBundle !== RUNNING_BUNDLE)
  } catch {
    return false
  }
}
