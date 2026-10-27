// Ported from the Keiyoushi "Toon FR" extension (madara theme, v1.6.1):
// https://github.com/keiyoushi/extensions-source/tree/main/src/fr/toonfr
// Licensed under the Apache License, Version 2.0.
// Its own chapter dates: French and English, relative or without a year. Dates fall at
// midnight UTC rather than Paris time, like the theme's.

import { javaDateParser } from "../../../sdk"
import { madara, parseEnglishDate } from "../../../themes/madara"

const months: Record<string, number> = {
  // French short and full
  janv: 1, jan: 1, janvier: 1, fev: 2, fevr: 2, fév: 2, févr: 2, fevrier: 2, février: 2, mar: 3, mars: 3, avr: 4, avril: 4, mai: 5, juin: 6,
  juil: 7, juillet: 7, aout: 8, août: 8, sep: 9, sept: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, déc: 12, decembre: 12, décembre: 12,
  // English short and full
  feb: 2, february: 2, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, september: 9, october: 10, november: 11, december: 12,
}
const units: [string[], number][] = [
  [["sec"], 1e3], [["min"], 6e4], [["heure", "hour"], 36e5], [["jour", "day"], 864e5],
  [["semaine", "week"], 6048e5], [["mois", "month"], 2592e6], [["an", "year"], 31536e6],
]
const madaraDefault = javaDateParser("MMMM d, yyyy", "en")

/** A day of the month, in the current year when there's none, or the year before when that would be in the future. */
function dayOf(day: number, month: number, year: number | undefined): number | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  const today = new Date()
  const date = Date.UTC(year ?? today.getUTCFullYear(), month - 1, day)
  return year === undefined && date > today.getTime() ? Date.UTC(today.getUTCFullYear() - 1, month - 1, day) : date
}

function parseChapterDate(text: string): number | undefined {
  const value = text.trim()
  const lower = value.toLowerCase()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (["today", "aujourd'hui", "aujourd’hui"].some((w) => lower.startsWith(w))) return today.getTime()
  if (["yesterday", "hier"].some((w) => lower.startsWith(w))) return today.getTime() - 864e5

  const relative = /(?:il y a\s+)?(\d+)\s*([a-zA-ZÀ-ÿ.]+)(?:\s+ago)?/i.exec(lower)
  const unit = relative ? units.find(([prefixes]) => prefixes.some((p) => relative[2].startsWith(p))) : undefined
  if (relative && unit) return Date.now() - Number(relative[1]) * unit[1]

  const base = madaraDefault(value) ?? parseEnglishDate(value)
  if (base !== undefined) return base

  const monthFirst = /^([a-zA-ZÀ-ÿ.]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(value)
  const dayFirst = /^(\d{1,2})\s+([a-zA-ZÀ-ÿ.]+)(?:\s+(\d{4}))?$/.exec(value)
  const [monthName, day, year] = monthFirst ? [monthFirst[1], monthFirst[2], monthFirst[3]] : dayFirst ? [dayFirst[2], dayFirst[1], dayFirst[3]] : []
  const month = monthName ? months[monthName.toLowerCase().replace(/\.+$/, "")] : undefined
  if (month !== undefined && day) return dayOf(Number(day), month, year ? Number(year) : undefined)

  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(value)
  if (numeric) {
    const year = Number(numeric[3])
    return dayOf(Number(numeric[1]), Number(numeric[2]), year < 100 ? year + 2000 : year)
  }
  return undefined
}

export default madara({
  info: {
    id: "3235818654344600611", name: "Toon FR", lang: "fr", version: "1.1.1", baseUrl: "https://toonfr.com", nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/fr/toonfr/res/mipmap-xhdpi/ic_launcher.png",
  },
  chapterMode: "MangaAjax",
  mangaSubString: "webtoon",
  mangaDetailsSelectorTitle: ".post-content h3",
  mangaDetailsSelectorStatus: "div.summary-heading:contains(Statut) + div.summary-content",
  altNameSelector: ".post-content_item:contains(Autre nom) .summary-content",
  parseDate: parseChapterDate,
})
