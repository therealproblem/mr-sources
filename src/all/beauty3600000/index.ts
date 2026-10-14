// Ported from the Keiyoushi "3600000 Beauty" extension (v1.4.6):
// https://github.com/keiyoushi/extensions-source/tree/main/src/all/beauty3600000
// Licensed under the Apache License, Version 2.0.

import { queryParam, queryString, send, type MangasPage, type Source } from "../../../sdk"

const baseUrl = "https://3600000.xyz"
const api = `${baseUrl}/wp-json/wp/v2`
const perPage = 100
const headers = { Referer: `${baseUrl}/` }

interface PostDto { id: number; link: string; title: { rendered: string }; content: { rendered: string }; date: string }

const decode = (text: string) => Honya.parseHTML(`<body>${text}</body>`).text()

async function get(url: string) {
  return send({ url, headers })
}

/** WordPress sometimes prefixes its JSON with notices; take the array at the end. */
function postsIn(body: string): PostDto[] {
  const json = /\[.*]\s*$/.exec(body)?.[0]
  if (!json) throw new Error("3600000.xyz didn't send its list of posts. It's often overloaded; try again in a while.")
  return JSON.parse(json) as PostDto[]
}

function toManga(post: PostDto) {
  const title = decode(post.title.rendered)
  if (!title.trim()) throw new Error("Title is mandatory")
  const img = Honya.parseHTML(`<body>${post.content.rendered}</body>`).selectFirst("img")
  return { url: String(post.id), title, thumbnailUrl: img?.attr("src") || undefined, status: "completed" as const }
}

async function postList(params: [string, string][]): Promise<MangasPage> {
  const response = await get(`${api}/posts?${queryString(params)}`)
  const page = Number(params.find(([k]) => k === "page")?.[1]) || 1
  return { mangas: postsIn(response.body).map(toManga), hasNextPage: page < (Number(response.headers["x-wp-totalpages"]) || 0) }
}

/** A post by ID, or by the slug older entries kept as their URL. */
async function post(url: string): Promise<PostDto> {
  const id = Number(url) || Number(queryParam(url, "p"))
  if (id) return JSON.parse((await get(`${api}/posts/${id}`)).body) as PostDto
  const found = postsIn((await get(`${api}/posts?${queryString([["slug", url.replace(/^\/|\/$/g, "")]])}`)).body)[0]
  if (!found) throw new Error("Post not found")
  return found
}

const categories: [string, string][] = [
  ["Any", ""], ["Aidol", "6"], ["China", "3293"], ["Chinese", "5"], ["Cosplay", "4"], ["Gravure", "7"], ["Japan", "3291"],
  ["Korea", "2128"], ["Magazine", "9"], ["Photobook", "10"], ["Thailand", "8"], ["Uncategorized", "1"], ["Western", "11"],
]

const source: Source = {
  info: {
    id: "5498091984644576825", name: "3600000 Beauty", lang: "all", version: "1.0.1", baseUrl, supportsLatest: false, nsfw: true,
    icon: "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/beauty3600000/res/mipmap-xhdpi/ic_launcher.png",
    rateLimits: [{ host: "3600000.xyz", permits: 1, periodMs: 1000 }],
    imageHeaders: headers,
  },

  getPopularManga(page) {
    return postList([["page", String(page)], ["per_page", String(perPage)]])
  },

  async searchManga(page, query, filters) {
    const select = (id: string) => { const f = filters.find((x) => x.id === id); return f?.type === "select" && f.selected > 0 ? f.options[f.selected].value : undefined }
    const category = select("category")
    const tag = select("tag")
    if (!category && !tag && !query.trim()) return this.getPopularManga(page)
    let tagSearch: number | undefined
    if (!category && !tag) {
      // A query that's exactly a tag's name browses that tag.
      try {
        const tags = JSON.parse((await get(`${api}/tags?${queryString([["slug", query.trim()]])}`)).body) as { id: number; name: string }[]
        tagSearch = tags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase())?.id
      } catch { /* search as text */ }
    }
    const params: [string, string][] = [["page", String(page)], ["per_page", String(perPage)]]
    if (query.trim() && tagSearch == null) params.push(["search", query.trim()])
    if (category) params.push(["categories", category])
    else if (tag) params.push(["tags", tag])
    else if (tagSearch != null) params.push(["tags", String(tagSearch)])
    return postList(params)
  },

  async getMangaDetails(manga) {
    const found = await post(manga.url)
    const terms = await Promise.all(["categories", "tags"].map(async (term) => {
      try { return JSON.parse((await get(`${api}/${term}?post=${found.id}`)).body) as { name: string }[] } catch { return [] }
    }))
    return { ...toManga(found), url: undefined, genres: terms.flat().map((t) => t.name) }
  },

  async getChapterList(manga) {
    const found = await post(manga.url)
    return [{ url: String(found.id), name: "Gallery", dateUpload: Date.parse(`${found.date}Z`) || undefined }]
  },

  async getPageList(chapter) {
    const found = await post(chapter.url)
    return Honya.parseHTML(`<body>${found.content.rendered}</body>`).select("img").map((img) => ({ url: img.attr("src") }))
  },

  getFilterList() {
    return [
      { type: "header", id: "h1", name: "NOTE: Only one filter will be applied!" },
      { type: "separator", id: "s1" },
      { type: "select", id: "category", name: "Category", options: categories.map(([label, value]) => ({ label, value })), selected: 0 },
      { type: "select", id: "tag", name: "Tag", options: tags.map(([label, value]) => ({ label, value })), selected: 0 },
    ]
  },
}

export default source

const tags: [string, string][] = [
  ["<Select tag>", ""],
  ["[☆JVID]", "1036"],
  ["[4K-STAR]", "1293"],
  ["[AISS爱丝钻石版]", "791"],
  ["[Akisoso秋楚楚]", "2578"],
  ["[AllGravure]", "1608"],
  ["[ArtGravia]", "2130"],
  ["[Arty亞緹]", "2207"],
  ["[Ayase_绮滨酱]", "2526"],
  ["[Azami]", "2164"],
  ["[Baijin Jiang]", "2225"],
  ["[BBUTTERMILK]", "3219"],
  ["[Bejean On Line]", "711"],
  ["[Bimilstory]", "3033"],
  ["[BLUECAKE]", "2454"],
  ["[BOMB.tv]", "102"],
  ["[BUNNY]", "4255"],
  ["[Byoru ビヨル]", "2275"],
  ["[CANDY糖果画报]", "590"],
  ["[CherryS]", "2658"],
  ["[chi.yun]", "2199"],
  ["[Chihiro]", "2645"],
  ["[CHOKmoson作品]", "729"],
  ["[Chono Black ちょうの]", "2337"],
  ["[coli厨 水無月みり]", "2237"],
  ["[Conboy]", "4649"],
  ["[Cosdoki]", "1822"],
  ["[Cosplay]", "458"],
  ["[CREAM PIE]", "4471"],
  ["[CreamSoda]", "2497"],
  ["[Crepe]", "1026"],
  ["[DCP-snaps]", "4655"],
  ["[Deepblue]", "4710"],
  ["[Deepmore Office]", "4435"],
  ["[DGC] (Desktop Gal Collection)", "172"],
  ["[Digi-Gra]", "634"],
  ["[Digital Photobook]", "1632"],
  ["[Dishwasher1910]", "2457"],
  ["[DJAWA]", "2131"],
  ["[DKGirl御女郎]", "208"],
  ["[DPB] デジタル写真集", "753"],
  ["[ED MOSAIC]", "1609"],
  ["[Eliza喵喵 Elizamiaomiao]", "2264"],
  ["[Ely]", "2316"],
  ["[EROONICHAN]", "1067"],
  ["[EroticBeauty]", "902"],
  ["[Espacia Korea]", "4881"],
  ["[Espasia Korea]", "3194"],
  ["[EternalDesire]", "904"],
  ["[Eugene Snap]", "4082"],
  ["[FAIRY CLUB 妖精社]", "3115"],
  ["[FANDING]", "3651"],
  ["[Fantasy Story]", "4381"],
  ["[FEILIN嗲囡囡]", "341"],
  ["[FemJoy]", "915"],
  ["[Fetibox]", "657"],
  ["[G44不会受伤]", "2600"],
  ["[G44不會受傷]", "2352"],
  ["[Ghost私房]", "1100"],
  ["[GirlFriendEnd]", "3439"],
  ["[Girlz-High]", "43"],
  ["[Glamarchive]", "4306"],
  ["[Graphis]", "15"],
  ["[H.J.Chamber作品集]", "2478"],
  ["[Hachi小芭]", "2255"],
  ["[Hana Bunny]", "2109"],
  ["[HaneAme 雨波]", "2444"],
  ["[Hegre-Art]", "903"],
  ["[Hidori Rose]", "2330"],
  ["[HIGH FANTASY]", "4279"],
  ["[Hokunaimeko]", "1700"],
  ["[HONGDAN]", "4760"],
  ["[HUAFOX系列]", "1811"],
  ["[HuaYang花漾]", "24"],
  ["[HuaYan花の颜]", "170"],
  ["[iAsian4u]", "1383"],
  ["[Idol Line]", "788"],
  ["[IKOF-6]", "4963"],
  ["[Ilogos アイロゴス]", "386"],
  ["[Image.tv]", "939"],
  ["[IMISS爱蜜社]", "160"],
  ["[IShow愛秀]", "2160"],
  ["[IVITAMIN系列]", "932"],
  ["[JOApictures]", "2872"],
  ["[Jooa]", "2283"],
  ["[JVID美模]", "1028"],
  ["[KaYa萱]", "2099"],
  ["[Kettoe]", "2375"],
  ["[KIMLEMON]", "3843"],
  ["[KIREI]", "4709"],
  ["[KiSiA]", "4421"],
  ["[KIYO キヨ]", "2431"],
  ["[KONELA]", "3213"],
  ["[Korean Realgraphic]", "3110"],
  ["[KuukoW クー子]", "2090"],
  ["[LEEHEE EXPRESS]", "2443"],
]
