// Date parsing the way Mihon extensions do it: a Java DateTimeFormatter pattern ("dd/MM/yyyy",
// "MMMM d, yyyy") read in a locale, case-insensitively, plus "3 days ago" style dates in the
// languages theme sites use.

/**
 * A parser for Java's `DateTimeFormatter.ofPattern(pattern, locale)`, giving milliseconds
 * since 1970 (UTC), or undefined for text that doesn't match. Month and weekday names come
 * from `Intl` in `locale` (a BCP 47 tag like "pt-BR"), with English as a fallback.
 * Supports d, M, L, y, u, H, h, m, s, a and E fields and 'quoted' text.
 */
export function javaDateParser(pattern: string, locale = "en"): (text: string) => number | undefined {
  const fields: string[] = []
  let source = ""
  for (const token of tokenize(pattern)) {
    if (token.literal !== undefined) {
      source += token.literal.split(/\s+/).map(escape).join("\\s+")
      continue
    }
    const { letter, count } = token
    switch (letter) {
      case "d": case "H": case "h": case "m": case "s":
        source += count === 1 ? "(\\d{1,2})" : `(\\d{${count}})`
        fields.push(letter)
        break
      case "M": case "L":
        if (count >= 3) {
          source += `(${alternatives(monthNames(locale).map(([name]) => name))})\\.?`
          fields.push("monthName")
        } else {
          source += count === 1 ? "(\\d{1,2})" : "(\\d{2})"
          fields.push("M")
        }
        break
      case "y": case "u":
        source += count === 2 ? "(\\d{2})" : "(\\d{4})"
        fields.push(count === 2 ? "yy" : "y")
        break
      case "a":
        source += `(${alternatives(dayPeriods(locale))})`
        fields.push("a")
        break
      case "E": case "e": case "c":
        source += `(?:${alternatives(weekdayNames(locale))})`
        break
      default:
        source += ".*?"
    }
  }
  const regex = new RegExp(source, "iu")
  return (text) => {
    const match = regex.exec(text.trim())
    if (!match) return undefined
    let year = 1970, month = 0, day = 1, hour = 0, minute = 0, second = 0
    let pm: boolean | undefined
    fields.forEach((field, index) => {
      const value = match[index + 1]
      switch (field) {
        case "d": day = Number(value); break
        case "M": month = Number(value) - 1; break
        case "monthName": month = monthNames(locale).find(([name]) => name.toLocaleLowerCase(locale) === value.toLocaleLowerCase(locale))?.[1] ?? -1; break
        case "y": year = Number(value); break
        case "yy": year = 2000 + Number(value); break
        case "H": case "h": hour = Number(value); break
        case "m": minute = Number(value); break
        case "s": second = Number(value); break
        case "a": pm = dayPeriods(locale).indexOf(value.toLocaleLowerCase(locale)) % 2 === 1; break
      }
    })
    if (pm !== undefined) hour = (hour % 12) + (pm ? 12 : 0)
    if (month < 0 || month > 11 || day < 1 || day > 31) return undefined
    return Date.UTC(year, month, day, hour, minute, second)
  }
}

/** A Java locale as Kotlin sources write it: Locale.US, Locale("pt", "BR"), Locale.forLanguageTag("es"). */
export function javaLocaleTag(expression: string | undefined, fallback = "en"): string {
  if (!expression) return fallback
  const constants: Record<string, string> = {
    US: "en-US", ENGLISH: "en", UK: "en-GB", ROOT: "en", FRENCH: "fr", FRANCE: "fr-FR", GERMAN: "de", GERMANY: "de-DE",
    ITALIAN: "it", ITALY: "it-IT", JAPANESE: "ja", JAPAN: "ja-JP", KOREAN: "ko", KOREA: "ko-KR", CHINESE: "zh", CHINA: "zh-CN",
    SIMPLIFIED_CHINESE: "zh-CN", TRADITIONAL_CHINESE: "zh-TW", CANADA: "en-CA", CANADA_FRENCH: "fr-CA",
  }
  const constant = /Locale\.([A-Z_]+)\b(?!\()/.exec(expression)?.[1]
  if (constant) return constants[constant] ?? fallback
  const parts = /Locale(?:\.forLanguageTag)?\(\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?/.exec(expression)
  if (parts) return parts[2] ? `${parts[1]}-${parts[2]}` : parts[1]
  return fallback
}

const relativeWords: [RegExp, number][] = [
  [words("year", "año", "ano", "năm", "yıl", "سنة", "سنوات"), 31536e6],
  [words("month", "mes", "tháng", "ay", "شهر", "أشهر", "شهور"), 2592e6],
  [words("week", "semana", "tuần", "hafta", "أسبوع", "أسابيع"), 6048e5],
  [words("day", "día", "dia", "jour", "hari", "gün", "ngày", "giorni", "أيام", "天"), 864e5],
  [words("hour", "hora", "heure", "jam", "saat", "giờ", "ore", "ساعة", "ساعات", "小时"), 36e5],
  [words("minute", "minuto", "min", "menit", "dakika", "phút", "دقيقة", "دقائق"), 6e4],
  [words("second", "segundo", "sec", "detik", "giây", "ثانية", "ثوان"), 1e3],
]

/**
 * Madara's `parseChapterDate`: "today" and "yesterday", "3 days ago" and the like in the
 * languages Madara sites use, or else `parse(text)`.
 */
export function parseRelativeOrAbsolute(text: string | undefined | null, parse: (text: string) => number | undefined, now = Date.now()): number | undefined {
  if (!text) return undefined
  const lower = text.toLowerCase()
  const startOfDay = new Date(now)
  startOfDay.setUTCHours(0, 0, 0, 0)
  if (["today", "hoje", "hoy"].some((w) => lower.startsWith(w))) return startOfDay.getTime()
  if (["yesterday", "ontem", "ayer", "يوم واحد"].some((w) => lower.startsWith(w))) return startOfDay.getTime() - 864e5
  const amount = Number(/\d+/.exec(lower)?.[0])
  if (Number.isFinite(amount)) {
    const unit = relativeWords.find(([pattern]) => pattern.test(lower))
    if (unit) return now - amount * unit[1]
  }
  return parse(text)
}

// A word not preceded by a letter, so "ay" doesn't match inside "mayıs", "may" or "days".
function words(...list: string[]): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${list.map(escape).join("|")})`, "u")
}

type Token = { literal: string; letter?: undefined; count?: undefined } | { literal?: undefined; letter: string; count: number }

function tokenize(pattern: string): Token[] {
  const tokens: Token[] = []
  for (let i = 0; i < pattern.length;) {
    const char = pattern[i]
    if (char === "'") {
      const end = pattern.indexOf("'", i + 1)
      const text = end < 0 ? pattern.slice(i + 1) : pattern.slice(i + 1, end)
      tokens.push({ literal: text === "" ? "'" : text })
      i = end < 0 ? pattern.length : end + 1
    } else if (/[a-zA-Z]/.test(char)) {
      let count = 1
      while (pattern[i + count] === char) count++
      tokens.push({ letter: char, count })
      i += count
    } else {
      tokens.push({ literal: char })
      i++
    }
  }
  return tokens
}

const nameCache = new Map<string, unknown>()
function cached<T>(key: string, make: () => T): T {
  if (!nameCache.has(key)) nameCache.set(key, make())
  return nameCache.get(key) as T
}

const englishMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

/** Every name a month goes by in `locale` (long, short, standalone) and English, longest first. */
function monthNames(locale: string): [string, number][] {
  return cached(`months.${locale}`, () => {
    const names: [string, number][] = []
    for (let month = 0; month < 12; month++) {
      const date = new Date(Date.UTC(2021, month, 15))
      for (const style of ["long", "short"] as const) {
        for (const tag of [locale, "en"]) {
          try {
            names.push([new Intl.DateTimeFormat(tag, { month: style, timeZone: "UTC" }).format(date), month])
            const parts = new Intl.DateTimeFormat(tag, { day: "numeric", month: style, timeZone: "UTC" }).formatToParts(date)
            const part = parts.find((p) => p.type === "month")?.value
            if (part) names.push([part, month])
          } catch { /* no Intl for the locale */ }
        }
      }
      names.push([englishMonths[month], month], [englishMonths[month].slice(0, 3), month])
    }
    const unique = new Map<string, number>()
    for (const [name, month] of names) {
      const clean = name.replace(/\.$/, "").trim()
      if (clean && !/^\d+$/.test(clean)) unique.set(clean, month)
    }
    return [...unique].sort((a, b) => b[0].length - a[0].length)
  })
}

function weekdayNames(locale: string): string[] {
  return cached(`weekdays.${locale}`, () => {
    const names = new Set<string>()
    for (let day = 0; day < 7; day++) {
      const date = new Date(Date.UTC(2021, 0, 3 + day))
      for (const style of ["long", "short"] as const) {
        for (const tag of [locale, "en"]) {
          try { names.add(new Intl.DateTimeFormat(tag, { weekday: style, timeZone: "UTC" }).format(date).replace(/\.$/, "")) } catch { /* none */ }
        }
      }
    }
    return [...names].sort((a, b) => b.length - a.length)
  })
}

/** AM and PM in `locale` and English, lowercased, AM at even indexes. */
function dayPeriods(locale: string): string[] {
  return cached(`periods.${locale}`, () => {
    const periods: string[] = []
    for (const tag of [locale, "en"]) {
      for (const hour of [9, 21]) {
        try {
          const parts = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true, timeZone: "UTC" }).formatToParts(new Date(Date.UTC(2021, 0, 1, hour)))
          periods.push((parts.find((p) => p.type === "dayPeriod")?.value ?? (hour < 12 ? "am" : "pm")).toLocaleLowerCase(locale))
        } catch {
          periods.push(hour < 12 ? "am" : "pm")
        }
      }
    }
    return periods
  })
}

function alternatives(list: string[]): string {
  return list.map((item) => item.split(/\s+/).map(escape).join("\\s+")).join("|")
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
