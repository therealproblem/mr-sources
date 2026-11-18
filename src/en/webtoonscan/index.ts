// Ported from the Keiyoushi "WebtoonScan" extension (madara theme, v1.6.1):
// https://github.com/keiyoushi/extensions-source/tree/main/src/en/webtoonscan
// Licensed under the Apache License, Version 2.0.

import { fetchJSON, formBody, type HTMLNode } from "../../../sdk"
import { madara } from "../../../themes/madara"

const baseUrl = "https://webtoonscan.org"

function summaryRow(document: HTMLNode, label: string): HTMLNode | undefined {
  return document.select(".post-content_item").find((item) => item.selectFirst("h5")?.text() === label)?.selectFirst(".summary-content") ?? undefined
}

/** As Kotlin's MarkdownDescription lays it out: synopsis, rating with release and type, other names. */
function description(document: HTMLNode, type: string | undefined): string | undefined {
  const synopsis = document.selectFirst("div.description-summary div.summary__content")
  const paragraphs = synopsis?.select("p") ?? []
  const text = paragraphs.length ? paragraphs.map((p) => p.text()).join("\n\n") : synopsis?.text()
  const scoreText = document.selectFirst("#averagerate")?.text().trim()
  const score = scoreText ? Number(scoreText) : NaN
  const votes = document.selectFirst("#countrate")?.text().trim()
  const halves = Math.min(10, Math.max(0, Math.ceil(score * 2 - 0.5)))
  const stars = "★".repeat(halves >> 1) + "✬".repeat(halves % 2) + "☆".repeat(5 - ((halves + 1) >> 1))
  const rating = Number.isFinite(score) ? `${stars} ${Math.round(score * 100) / 100}${votes && /^\d+$/.test(votes) ? ` (${votes})` : ""}` : ""
  const info = [summaryRow(document, "Release")?.text(), type].filter(Boolean).join(" · ")
  const alternative = summaryRow(document, "Alternative")?.ownText().trim()
  const names = alternative && !/Updating|Atualizando/i.test(alternative) ? [...new Set(alternative.split(", ").map((n) => n.trim()).filter(Boolean))] : []
  const altTitles = names.length ? `**Alternative Name(s):**\n${names.map((n) => `- ${n}`).join("\n")}` : ""
  return [text, [rating, info].filter(Boolean).join("\n"), altTitles].filter(Boolean).join("\n\n") || undefined
}

export default madara({
  info: {
    id: "3062846066388633553",
    name: "WebtoonScan",
    lang: "en",
    version: "1.1.1",
    baseUrl,
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/webtoonscan/res/mipmap-xhdpi/ic_launcher.png",
  },
  mangaSubString: "manhwa",
  genreDirectory: "genre",
  seriesTypeSelector: ".post-content_item:has(h5:matchesOwn(^\\s*Type\\s*$)) .summary-content",
  chapterDateFormat: { pattern: "d MMM yy", locale: "en" },
  // The type goes in the description's info line rather than the genres.
  details(document, manga) {
    const type = summaryRow(document, "Type")?.text() || undefined
    return { ...manga, genres: manga.genres?.filter((genre) => genre !== type), description: description(document, type) }
  },
  // The series page and its ajax/chapters list only the newest chapters.
  async fetchChapters(mangaPath, id, parse) {
    const form = formBody([["action", "wp-manga-get-chapters"], ["manga_id", id], ["offset", "0"]])
    const headers = { ...form.headers, "X-Requested-With": "XMLHttpRequest", Referer: `${baseUrl}${mangaPath}` }
    const { data } = await fetchJSON<{ data: { html: string } }>({ url: `${baseUrl}/wp-admin/admin-ajax.php`, method: "POST", body: form.body, headers })
    return parse(Honya.parseHTML(data.html, baseUrl))
  },
})
