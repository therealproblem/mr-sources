// Ported from the Keiyoushi "MangaDex" extension's MangaDexFilters.kt (Apache License 2.0),
// with the content rating held to safe and suggestive (see index.ts).

import type { Filter, FilterOption } from "../../../sdk"

/** The content ratings this source ever asks for: MangaDex's own default. */
export const safeRatings = ["safe", "suggestive"]

export interface FilterDefaults {
  /** The content ratings ticked to start with, from `safeRatings`. */
  contentRating: string[]
  /** The original languages ticked to start with ("ja", "zh", "ko"). */
  originalLanguages: string[]
}

export function filterList(defaults: FilterDefaults): Filter[] {
  return [
    { type: "checkboxes", id: "hasAvailableChapters", name: "Availability", options: [{ label: "Has available chapters", value: "true" }], checked: [] },
    {
      type: "checkboxes", id: "originalLanguage", name: "Original language",
      options: [{ label: "Japanese (Manga)", value: "ja" }, { label: "Chinese (Manhua)", value: "zh" }, { label: "Korean (Manhwa)", value: "ko" }],
      checked: defaults.originalLanguages,
    },
    {
      type: "checkboxes", id: "contentRating", name: "Content rating",
      options: [{ label: "Safe", value: "safe" }, { label: "Suggestive", value: "suggestive" }],
      checked: defaults.contentRating,
    },
    {
      type: "checkboxes", id: "publicationDemographic", name: "Publication demographic",
      options: Object.entries(demographics).map(([value, label]) => ({ label, value })), checked: [],
    },
    {
      type: "checkboxes", id: "status", name: "Status",
      options: [{ label: "Ongoing", value: "ongoing" }, { label: "Completed", value: "completed" }, { label: "Hiatus", value: "hiatus" }, { label: "Cancelled", value: "cancelled" }],
      checked: [],
    },
    // Popular only lists titles created in the last 30 days and Latest lists chapters, so
    // neither matches a sort option.
    { type: "sort", id: "order", name: "Sort", options: sortables, selected: 5, ascending: false, listings: {} },
    {
      type: "select", id: "createdAtSince", name: "Created within last",
      options: [{ label: "Any", value: "0" }, { label: "Day", value: "1" }, { label: "Week", value: "7" }, { label: "Month", value: "30" }, { label: "Year", value: "365" }],
      selected: 0,
    },
    { type: "select", id: "includedTagsMode", name: "Included tags mode", options: tagModes, selected: 0 },
    { type: "select", id: "excludedTagsMode", name: "Excluded tags mode", options: tagModes, selected: 1 },
    ...tagGroups.map((group): Filter => ({ type: "tristates", id: group.id, name: group.name, options: group.tags, included: [], excluded: [] })),
  ]
}

/** The API query for `filters`, as `searchManga` received them. */
export function queryParams(filters: Filter[], dexLang: string): [string, string][] {
  const params: [string, string][] = []
  let ratings: string[] = safeRatings
  for (const filter of filters) {
    switch (filter.type) {
      case "checkboxes": {
        const checked = filter.options.map((o) => o.value).filter((value) => filter.checked.includes(value))
        if (filter.id === "hasAvailableChapters") {
          if (checked.length > 0) params.push(["hasAvailableChapters", "true"], ["availableTranslatedLanguage[]", dexLang])
        } else if (filter.id === "originalLanguage") {
          // MangaDex files Chinese manhua under both zh and zh-hk.
          for (const lang of checked) {
            if (lang === "zh") params.push(["originalLanguage[]", "zh-hk"])
            params.push(["originalLanguage[]", lang])
          }
        } else if (filter.id === "contentRating") {
          ratings = checked.filter((rating) => safeRatings.includes(rating))
        } else {
          params.push(...checked.map((value): [string, string] => [`${filter.id}[]`, value]))
        }
        break
      }
      case "sort": {
        const option = filter.selected === undefined ? undefined : filter.options[filter.selected]
        if (option) params.push([`order[${option.value}]`, filter.ascending ? "asc" : "desc"])
        break
      }
      case "select": {
        const value = filter.options[filter.selected]?.value
        if (value === undefined) break
        if (filter.id === "createdAtSince") {
          const days = Number(value)
          if (days > 0) params.push(["createdAtSince", apiDate(Math.floor((Date.now() - days * 864e5) / 36e5) * 36e5)])
        } else {
          params.push([filter.id, value])
        }
        break
      }
      case "tristates":
        for (const option of filter.options) {
          if (filter.included.includes(option.value)) params.push(["includedTags[]", option.value])
          else if (filter.excluded.includes(option.value)) params.push(["excludedTags[]", option.value])
        }
        break
    }
  }
  // With no rating the API adds erotica, so none ticked means both safe ones.
  for (const rating of ratings.length > 0 ? ratings : safeRatings) params.push(["contentRating[]", rating])
  return params
}

/** The API's date format: UTC without an offset. */
export function apiDate(time: number): string {
  return new Date(time).toISOString().slice(0, 19)
}

export const demographics: Record<string, string> = {
  none: "None",
  shounen: "Shounen",
  shoujo: "Shoujo",
  seinen: "Seinen",
  josei: "Josei",
}

const sortables: FilterOption[] = [
  { label: "Alphabetic", value: "title" },
  { label: "Chapter uploaded at", value: "latestUploadedChapter" },
  { label: "Number of follows", value: "followedCount" },
  { label: "Content created at", value: "createdAt" },
  { label: "Content info updated at", value: "updatedAt" },
  { label: "Relevance", value: "relevance" },
  { label: "Year", value: "year" },
  { label: "Rating", value: "rating" },
]

const tagModes: FilterOption[] = [{ label: "And", value: "AND" }, { label: "Or", value: "OR" }]

const tag = (value: string, label: string): FilterOption => ({ label, value })

/** MangaDex's tags by group, in the order details list them (all of them: api.mangadex.org/manga/tag). */
export const tagGroups: { id: string; name: string; tags: FilterOption[] }[] = [
  {
    id: "content", name: "Content", tags: [
      tag("b29d6a3d-1569-4e7a-8caf-7557bc92cd5d", "Gore"),
      tag("97893a4c-12af-4dac-b6be-0dffb353568e", "Sexual violence"),
    ],
  },
  {
    id: "format", name: "Format", tags: [
      tag("b11fda93-8f1d-4bef-b2ed-8803d3733170", "4-Koma"),
      tag("f4122d1c-3b44-44d0-9936-ff7502c39ad3", "Adaptation"),
      tag("51d83883-4103-437c-b4b1-731cb73d786c", "Anthology"),
      tag("0a39b5a1-b235-4886-a747-1d05d216532d", "Award Winning"),
      tag("b13b2a48-c720-44a9-9c77-39c9979373fb", "Doujinshi"),
      tag("7b2ce280-79ef-4c09-9b58-12b7c23a9b78", "Fan Colored"),
      tag("f5ba408b-0e7a-484d-8d49-4e9125ac96de", "Full Color"),
      tag("3e2b8dae-350e-4ab8-a8ce-016e844b9f0d", "Long Strip"),
      tag("320831a8-4026-470b-94f6-8353740e6f04", "Official Colored"),
      tag("0234a31e-a729-4e28-9d6a-3f87c4966b9e", "Oneshot"),
      tag("891cf039-b895-47f0-9229-bef4c96eccd4", "User Created"),
      tag("e197df38-d0e7-43b5-9b09-2842d0c326dd", "Web Comic"),
    ],
  },
  {
    id: "genre", name: "Genre", tags: [
      tag("391b0423-d847-456f-aff0-8b0cfc03066b", "Action"),
      tag("87cc87cd-a395-47af-b27a-93258283bbc6", "Adventure"),
      tag("5920b825-4181-4a17-beeb-9918b0ff7a30", "Boy's Love"),
      tag("4d32cc48-9f00-4cca-9b5a-a839f0764984", "Comedy"),
      tag("5ca48985-9a9d-4bd8-be29-80dc0303db72", "Crime"),
      tag("b9af3a63-f058-46de-a9a0-e0c13906197a", "Drama"),
      tag("cdc58593-87dd-415e-bbc0-2ec27bf404cc", "Fantasy"),
      tag("a3c67850-4684-404e-9b7f-c69850ee5da6", "Girl's Love"),
      tag("33771934-028e-4cb3-8744-691e866a923e", "Historical"),
      tag("cdad7e68-1419-41dd-bdce-27753074a640", "Horror"),
      tag("ace04997-f6bd-436e-b261-779182193d3d", "Isekai"),
      tag("81c836c9-914a-4eca-981a-560dad663e73", "Magical Girls"),
      tag("50880a9d-5440-4732-9afb-8f457127e836", "Mecha"),
      tag("c8cbe35b-1b2b-4a3f-9c37-db84c4514856", "Medical"),
      tag("ee968100-4191-4968-93d3-f82d72be7e46", "Mystery"),
      tag("b1e97889-25b4-4258-b28b-cd7f4d28ea9b", "Philosophical"),
      tag("423e2eae-a7a2-4a8b-ac03-a8351462d71d", "Romance"),
      tag("256c8bd9-4904-4360-bf4f-508a76d67183", "Sci-Fi"),
      tag("e5301a23-ebd9-49dd-a0cb-2add944c7fe9", "Slice of Life"),
      tag("69964a64-2f90-4d33-beeb-f3ed2875eb4c", "Sports"),
      tag("7064a261-a137-4d3a-8848-2d385de3a99c", "Superhero"),
      tag("07251805-a27e-4d59-b488-f0bfbec15168", "Thriller"),
      tag("f8f62932-27da-4fe4-8ee1-6779a8c5edba", "Tragedy"),
      tag("acc803a4-c95a-4c22-86fc-eb6b582d82a2", "Wuxia"),
    ],
  },
  {
    id: "theme", name: "Theme", tags: [
      tag("e64f6742-c834-471d-8d72-dd51fc02b835", "Aliens"),
      tag("3de8c75d-8ee3-48ff-98ee-e20a65c86451", "Animals"),
      tag("ea2bc92d-1c26-4930-9b7c-d5c0dc1b6869", "Cooking"),
      tag("9ab53f92-3eed-4e9b-903a-917c86035ee3", "Crossdressing"),
      tag("da2d50ca-3018-4cc0-ac7a-6b7d472a29ea", "Delinquents"),
      tag("39730448-9a5f-48a2-85b0-a70db87b1233", "Demons"),
      tag("2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a", "Genderswap"),
      tag("3bb26d85-09d5-4d2e-880c-c34b974339e9", "Ghosts"),
      tag("fad12b5e-68ba-460e-b933-9ae8318f5b65", "Gyaru"),
      tag("aafb99c1-7f60-43fa-b75f-fc9502ce29c7", "Harem"),
      tag("5bd0e105-4481-44ca-b6e7-7544da56b1a3", "Incest"),
      tag("2d1f5d56-a1e5-4d0d-a961-2193588b08ec", "Loli"),
      tag("85daba54-a71c-4554-8a28-9901a8b0afad", "Mafia"),
      tag("a1f53773-c69a-4ce5-8cab-fffcd90b1565", "Magic"),
      tag("799c202e-7daa-44eb-9cf7-8a3c0441531e", "Martial Arts"),
      tag("ac72833b-c4e9-4878-b9db-6c8a4a99444a", "Military"),
      tag("dd1f77c5-dea9-4e2b-97ae-224af09caf99", "Monster Girls"),
      tag("36fd93ea-e8b8-445e-b836-358f02b3d33d", "Monsters"),
      tag("f42fbf9e-188a-447b-9fdc-f19dc1e4d685", "Music"),
      tag("489dd859-9b61-4c37-af75-5b18e88daafc", "Ninja"),
      tag("92d6d951-ca5e-429c-ac78-451071cbf064", "Office Workers"),
      tag("df33b754-73a3-4c54-80e6-1a74a8058539", "Police"),
      tag("9467335a-1b83-4497-9231-765337a00b96", "Post-Apocalyptic"),
      tag("3b60b75c-a2d7-4860-ab56-05f391bb889c", "Psychological"),
      tag("0bc90acb-ccc1-44ca-a34a-b9f3a73259d0", "Reincarnation"),
      tag("65761a2a-415e-47f3-bef2-a9dababba7a6", "Reverse Harem"),
      tag("81183756-1453-4c81-aa9e-f6e1b63be016", "Samurai"),
      tag("caaa44eb-cd40-4177-b930-79d3ef2afe87", "School Life"),
      tag("ddefd648-5140-4e5f-ba18-4eca4071d19b", "Shota"),
      tag("eabc5b4c-6aff-42f3-b657-3e90cbd00b75", "Supernatural"),
      tag("5fff9cde-849c-4d78-aab0-0d52b2ee1d25", "Survival"),
      tag("292e862b-2d17-4062-90a2-0356caa4ae27", "Time Travel"),
      tag("31932a7e-5b8e-49a6-9f12-2afa39dc544c", "Traditional Games"),
      tag("d7d1730f-6eb0-4ba6-9437-602cac38664c", "Vampires"),
      tag("9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8", "Video Games"),
      tag("d14322ac-4d6f-4e9b-afd9-629d5f4d8a41", "Villainess"),
      tag("8c86611e-fab7-4986-9dec-d1a2f44acdd5", "Virtual Reality"),
      tag("631ef465-9aba-4afb-b0fc-ea10efe274a8", "Zombies"),
    ],
  },
]
