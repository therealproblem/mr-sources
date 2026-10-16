// MD5 and AES-CBC decryption, for sites that encrypt their page lists the way CryptoJS does.
// JavaScriptCore has no WebCrypto, so these are plain implementations; they're fine for the
// few kilobytes a page list is, not for images.

const md5Shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const md5Constants = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)

export function md5(input: Uint8Array): Uint8Array {
  const length = input.length
  const padded = new Uint8Array((((length + 8) >>> 6) + 1) * 64)
  padded.set(input)
  padded[length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, (length * 8) >>> 0, true)
  view.setUint32(padded.length - 4, Math.floor(length / 2 ** 29), true)

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  const words = new Uint32Array(16)
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4, true)
    let a = a0, b = b0, c = c0, d = d0
    for (let i = 0; i < 64; i++) {
      let f: number, g: number
      if (i < 16) { f = (b & c) | (~b & d); g = i }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16 }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16 }
      else { f = c ^ (b | ~d); g = (7 * i) % 16 }
      f = (f + a + md5Constants[i] + words[g]) >>> 0
      a = d; d = c; c = b
      const shift = md5Shifts[(i >> 4) * 4 + (i % 4)]
      b = (b + ((f << shift) | (f >>> (32 - shift)))) >>> 0
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0
  }
  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((word, i) => outView.setUint32(i * 4, word, true))
  return out
}

/**
 * OpenSSL's EVP_BytesToKey with MD5 and one iteration, as CryptoJS derives a key and IV from
 * a passphrase and salt.
 */
export function evpBytesToKey(password: Uint8Array, salt: Uint8Array, keyLength = 32, ivLength = 16): { key: Uint8Array; iv: Uint8Array } {
  const derived: number[] = []
  let previous: Uint8Array = new Uint8Array(0)
  while (derived.length < keyLength + ivLength) {
    const input = new Uint8Array(previous.length + password.length + salt.length)
    input.set(previous)
    input.set(password, previous.length)
    input.set(salt, previous.length + password.length)
    previous = md5(input)
    derived.push(...previous)
  }
  return { key: new Uint8Array(derived.slice(0, keyLength)), iv: new Uint8Array(derived.slice(keyLength, keyLength + ivLength)) }
}

export function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length >> 1)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

// MARK: AES

const sbox = new Uint8Array(256)
const inverseSbox = new Uint8Array(256)
{
  // The S-box from GF(2^8) inverses, walking the field by multiplying by 3.
  let p = 1, q = 1
  const rotate = (x: number, n: number) => ((x << n) | (x >> (8 - n))) & 0xff
  do {
    p = p ^ ((p << 1) & 0xff) ^ (p & 0x80 ? 0x1b : 0)
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff
    if (q & 0x80) q ^= 0x09
    sbox[p] = q ^ rotate(q, 1) ^ rotate(q, 2) ^ rotate(q, 3) ^ rotate(q, 4) ^ 0x63
  } while (p !== 1)
  sbox[0] = 0x63
  for (let i = 0; i < 256; i++) inverseSbox[sbox[i]] = i
}

function multiply(a: number, b: number): number {
  let product = 0
  for (; b; b >>= 1) {
    if (b & 1) product ^= a
    a = ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff
  }
  return product
}

function expandKey(key: Uint8Array): Uint8Array[] {
  const nk = key.length / 4
  if (![4, 6, 8].includes(nk)) throw new Error("AES keys are 16, 24 or 32 bytes")
  const rounds = nk + 6
  const words: Uint8Array[] = []
  for (let i = 0; i < nk; i++) words.push(key.slice(i * 4, i * 4 + 4))
  let rcon = 1
  for (let i = nk; i < 4 * (rounds + 1); i++) {
    let word = Uint8Array.from(words[i - 1])
    if (i % nk === 0) {
      word = Uint8Array.from([sbox[word[1]] ^ rcon, sbox[word[2]], sbox[word[3]], sbox[word[0]]])
      rcon = multiply(rcon, 2)
    } else if (nk > 6 && i % nk === 4) {
      word = word.map((b) => sbox[b])
    }
    words.push(word.map((b, j) => b ^ words[i - nk][j]))
  }
  // One 16-byte round key per round, column by column.
  return Array.from({ length: rounds + 1 }, (_, round) => {
    const roundKey = new Uint8Array(16)
    for (let c = 0; c < 4; c++) roundKey.set(words[round * 4 + c], c * 4)
    return roundKey
  })
}

function decryptBlock(block: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  let state = block.map((b, i) => b ^ roundKeys[roundKeys.length - 1][i])
  for (let round = roundKeys.length - 2; round >= 0; round--) {
    // InvShiftRows and InvSubBytes: row r moves r columns right.
    const shifted = new Uint8Array(16)
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) shifted[r + 4 * ((c + r) % 4)] = inverseSbox[state[r + 4 * c]]
    state = shifted.map((b, i) => b ^ roundKeys[round][i])
    if (round === 0) break
    for (let c = 0; c < 4; c++) {
      const [s0, s1, s2, s3] = state.slice(c * 4, c * 4 + 4)
      state[c * 4] = multiply(s0, 14) ^ multiply(s1, 11) ^ multiply(s2, 13) ^ multiply(s3, 9)
      state[c * 4 + 1] = multiply(s0, 9) ^ multiply(s1, 14) ^ multiply(s2, 11) ^ multiply(s3, 13)
      state[c * 4 + 2] = multiply(s0, 13) ^ multiply(s1, 9) ^ multiply(s2, 14) ^ multiply(s3, 11)
      state[c * 4 + 3] = multiply(s0, 11) ^ multiply(s1, 13) ^ multiply(s2, 9) ^ multiply(s3, 14)
    }
  }
  return state
}

/** AES in CBC mode, PKCS#7 padding removed. */
export function aesCbcDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  if (data.length % 16 !== 0) throw new Error("AES-CBC data isn't a whole number of blocks")
  const roundKeys = expandKey(key)
  const out = new Uint8Array(data.length)
  let previous: Uint8Array = iv
  for (let offset = 0; offset < data.length; offset += 16) {
    const block = data.slice(offset, offset + 16)
    out.set(decryptBlock(block, roundKeys).map((b, i) => b ^ previous[i]), offset)
    previous = block
  }
  const padding = out[out.length - 1]
  return padding >= 1 && padding <= 16 ? out.slice(0, out.length - padding) : out
}
