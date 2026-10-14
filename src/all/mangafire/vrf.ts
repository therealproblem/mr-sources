// Ported from the Keiyoushi "MangaFire" extension's VrfSigner.kt (Apache License 2.0).
// The site's API wants a `vrf` parameter: the path and sorted query, through three rounds of
// a keyed substitution cipher, as unpadded URL-safe base64.

import { base64Decode, base64Encode, queryString, utf8Encode } from "../../../sdk"

const stages: [string, string, number][] = [
  [
    "yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==",
    "0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=",
    0x5a,
  ],
  [
    "IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==",
    "AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==",
    0x35,
  ],
  [
    "NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==",
    "DELOJgPsVaCcblDtTGMdHzM=",
    0xba,
  ],
]

const decoded = stages.map(([table, key, iv]) => ({ table: base64Decode(table), key: base64Decode(key), iv }))

export function sign(path: string): string {
  let data = utf8Encode(path)
  for (const { table, key, iv } of decoded) {
    const out = new Uint8Array(data.length)
    let previous = iv
    for (let i = 0; i < data.length; i++) {
      previous = table[(data[i] ^ key[i % key.length] ^ previous) & 0xff]
      out[i] = previous
    }
    data = out
  }
  return base64Encode(data, { urlSafe: true, padding: false })
}

/** `baseUrl + path` with its parameters sorted by name and signed, as VrfSigner's interceptor does. */
export function signedUrl(baseUrl: string, path: string, params: [string, string][]): string {
  const sorted = [...params].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  let lastKey = ""
  let index = 0
  const query = sorted.map(([key, value]) => {
    let name = key
    // Put the index in keys ending in [].
    if (key.endsWith("[]")) {
      if (lastKey !== key) index = 0
      lastKey = key
      name = key.replace("[]", `[${index++}]`)
    }
    return `${name}=${value}`
  }).join("&")
  const signed = path.replace(/^\/api/, "") + (sorted.length > 0 ? `?${query}` : "")
  return `${baseUrl}${path}?${queryString([...sorted, ["vrf", sign(signed)]])}`
}
