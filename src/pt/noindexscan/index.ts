// Ported from the Keiyoushi "Hanami Heaven" extension (madara theme, v1.6.6):
// https://github.com/keiyoushi/extensions-source/tree/main/src/pt/noindexscan
// Licensed under the Apache License, Version 2.0.
// The site's own catalogue and its filters are here; the theme reads the work and chapter pages.

import { fetchPage, queryString, relativeUrl, type Filter, type FilterOption, type MangasPage, type Source } from "../../../sdk"
import { madara } from "../../../themes/madara"

const baseUrl = "https://hanamiheaven.org"
const catalogueUrl = `${baseUrl}/todas-as-obras/`
const metadata = (label: string, value: string) => `.mch-work__metadata div:has(> dt:contains(${label})) ${value}`

const source = madara({
  info: {
    id: "987786689720213769",
    name: "Hanami Heaven",
    lang: "pt-BR",
    version: "1.2.0",
    baseUrl,
    nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/pt/noindexscan/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "hanamiheaven.org", permits: 3, periodMs: 2000 }],
  },
  ajax: false,
  mangaSubString: "todas-as-obras",
  chapterDateFormat: { pattern: "dd/MM/yyyy", locale: "en" },
  mangaDetailsSelectorTitle: "#mch-work-title",
  mangaDetailsSelectorAuthor: metadata("Autor", "a"),
  mangaDetailsSelectorArtist: metadata("Artista", "a"),
  mangaDetailsSelectorStatus: ".mch-work__status",
  mangaDetailsSelectorDescription: "#mch-work-synopsis",
  mangaDetailsSelectorThumbnail: ".mch-work__cover img",
  mangaDetailsSelectorGenre: metadata("Gêneros", "a"),
  mangaDetailsSelectorTag: metadata("Tags", "a"),
  seriesTypeSelector: metadata("Tipo", "dd"),
  altNameSelector: metadata("Nome alternativo", "dd"),
})

async function catalogue(page: number, params: [string, string][]): Promise<MangasPage> {
  const query = queryString([...params, ...(page > 1 ? [["pagina", String(page)] as [string, string]] : [])])
  const { document } = await fetchPage(query ? `${catalogueUrl}?${query}` : catalogueUrl)
  // Novels have text chapters, which the reader can't show.
  const mangas = document.select("li.mch-catalogue-card:not(:has(.mch-catalogue-card__meta span:contains(Novel)))").flatMap((card) => {
    const link = card.selectFirst(".mch-catalogue-card__title a")
    const id = card.attr("data-work-id")
    if (!link || !id) return []
    // As the theme keeps a manga: its post ID, with its path in Mihon's memo.
    return [{ url: id, title: link.text(), thumbnailUrl: card.selectFirst("img")?.absUrl("src") || undefined, sourceData: JSON.stringify({ path: relativeUrl(link.absUrl("href")) }) }]
  })
  return { mangas, hasNextPage: document.selectFirst(".mch-catalogue__pages a.next") != null }
}

const select = (id: string, name: string, choices: [string, string][]): Filter => ({ type: "select", id, name, options: choices.map(([label, value]) => ({ label, value })), selected: 0 })

const source_: Source = {
  ...source,

  getPopularManga(page) {
    return catalogue(page, [["ordem", "rating"]])
  },

  getLatestUpdates(page) {
    return catalogue(page, [])
  },

  searchManga(page, query, filters) {
    // Each filter's id is the catalogue's query parameter.
    const params: [string, string][] = []
    for (const filter of filters) {
      if (filter.type === "select" && filter.options[filter.selected]?.value) params.push([filter.id, filter.options[filter.selected].value])
      if (filter.type === "text" && filter.value.trim()) params.push([filter.id, filter.value.trim()])
      if (filter.type === "tristates") params.push(...filter.included.map((slug): [string, string] => ["genero[]", slug]), ...filter.excluded.map((slug): [string, string] => ["sem-genero[]", slug]))
    }
    if (query.trim()) params.push(["busca", query.trim()])
    return catalogue(page, params)
  },

  getFilterList(data) {
    const genres = Array.isArray(data) ? (data as FilterOption[]) : []
    return [
      { ...select("ordem", "Ordenar por", [["Atualizações", ""], ["Adicionadas recentemente", "newest"], ["Nome: A–Z", "alphabet"], ["Nota", "rating"]]), listings: { popular: "rating", latest: "" } } as Filter,
      select("tipo", "Tipo", [["Todos", ""], ["Manhwa", "Manhwa"], ["Pornhwa", "Pornhwa"], ["Doujin", "Doujin"], ["Doujinshi", "Doujinshi"]]),
      select("status", "Status", [["Todos", ""], ["Em andamento", "on-going"], ["Completa", "end"], ["Cancelada", "canceled"], ["Em espera", "on-hold"], ["Em breve", "upcoming"]]),
      select("capitulos", "Quantidade de capítulos", [["Qualquer quantidade", ""], ["De 1 a 50", "short"], ["De 51 a 100", "medium"], ["Mais de 100", "long"]]),
      { type: "text", id: "ano", name: "Ano de lançamento", value: "" },
      ...(genres.length ? [{ type: "tristates", id: "genres", name: "Gêneros", options: genres, included: [], excluded: [] } as Filter] : []),
    ]
  },

  async fetchFilterData() {
    const { document } = await fetchPage(catalogueUrl)
    return document.select("input[name='genero[]']").map((input): FilterOption => ({ label: input.parent()?.text().trim() ?? "", value: input.attr("value") }))
  },
}

export default source_
