const KEY = 'sigapei.device'

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'appareil-inconnu'
  }
}

const OS = [
  [/Android ([\d.]+)/, 'Android'],
  [/iPhone OS ([\d_]+)/, 'iOS'],
  [/iPad.*OS ([\d_]+)/, 'iPadOS'],
  [/Windows NT/, 'Windows'],
  [/Mac OS X/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
]
const BROWSERS = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

export function getDeviceInfo() {
  const ua = navigator.userAgent
  let os = 'Inconnu'
  for (const [re, name] of OS) {
    const m = ua.match(re)
    if (m) { os = m[1] ? `${name} ${m[1].replace(/_/g, '.')}` : name; break }
  }
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1] ?? 'Navigateur'
  const type = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? 'tablette'
    : /Mobi|iPhone|Android/.test(ua) ? 'mobile' : 'ordinateur'
  return { identifiantLocal: getDeviceId(), nomAppareil: `${browser} sur ${os}`, type, os }
}
