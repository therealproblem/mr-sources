// Ported from the Keiyoushi "Weeb Central" extension's Filters.kt (Apache License 2.0).

import type { Filter, FilterOption } from "../../../sdk"

/**
 * Filter IDs double as the query parameter names; the tag tri-state group expands to
 * `included_tag` / `excluded_tag`.
 */
export function filterList(sort?: string): Filter[] {
  const sortOptions = options("Best Match", "Alphabet", "Popularity", "Subscribers", "Recently Added", "Latest Updates")
  const anyTrueFalse = options("Any", "True", "False")

  return [
    { type: "select", id: "sort", name: "Sort", options: sortOptions, selected: Math.max(0, sortOptions.findIndex((o) => o.value === sort)), listings: { popular: "Popularity", latest: "Latest Updates" } },
    { type: "select", id: "order", name: "Sort Order", options: options("Descending", "Ascending"), selected: 0 },
    { type: "select", id: "official", name: "Official Translation", options: anyTrueFalse, selected: 0 },
    { type: "select", id: "anime", name: "Anime Adaptation", options: anyTrueFalse, selected: 0 },
    { type: "select", id: "adult", name: "Adult Content", options: anyTrueFalse, selected: 0 },
    { type: "text", id: "author", name: "Author (Case-sensitive)", value: "" },
    { type: "checkboxes", id: "included_status", name: "Series Status", options: options("Ongoing", "Complete", "Hiatus", "Canceled"), checked: [] },
    { type: "checkboxes", id: "included_type", name: "Series Type", options: options("Manga", "Manhwa", "Manhua", "OEL"), checked: [] },
    { type: "tristates", id: "tag", name: "Tags", options: tags, included: [], excluded: [] },
  ]
}

export function queryParams(filters: Filter[]): [string, string][] {
  return filters.flatMap((filter): [string, string][] => {
    switch (filter.type) {
      case "select": {
        const option = filter.options[filter.selected]
        return option ? [[filter.id, option.value]] : []
      }
      case "text":
        return filter.value ? [[filter.id, filter.value]] : []
      case "checkboxes":
        return filter.options.filter((o) => filter.checked.includes(o.value)).map((o) => [filter.id, o.value])
      case "tristates":
        return filter.options.flatMap((o): [string, string][] => {
          if (filter.included.includes(o.value)) return [[`included_${filter.id}`, o.value]]
          if (filter.excluded.includes(o.value)) return [[`excluded_${filter.id}`, o.value]]
          return []
        })
      default:
        return []
    }
  })
}

function options(...values: string[]): FilterOption[] {
  return values.map((value) => ({ label: value, value }))
}

const tags = options(
  "Action", "Adult", "Adventure", "Comedy", "Doujinshi", "Drama", "Ecchi", "Fantasy",
  "Gender Bender", "Harem", "Hentai", "Historical", "Horror", "Isekai", "Josei", "Lolicon",
  "Martial Arts", "Mature", "Mecha", "Mystery", "Psychological", "Romance", "School Life",
  "Sci-fi", "Seinen", "Shotacon", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai",
  "Slice of Life", "Smut", "Sports", "Supernatural", "Tragedy", "Yaoi", "Yuri", "Other",
)
