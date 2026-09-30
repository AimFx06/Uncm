const fs = require('node:fs/promises')
const crypto = require('node:crypto')

const CORE_KEY = Buffer.from('687A4852416D736F356B496E62617857', 'hex')
const META_KEY = Buffer.from('2331346C6A6B5F215C5D2630553C2728', 'hex')
const MAGIC = Buffer.from('CTENFDAM')

function aesDecrypt(buffer, key) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null)
  decipher.setAutoPadding(true)
  return Buffer.concat([decipher.update(buffer), decipher.final()])
}

function buildKeyBox(keyData) {
  const box = Array.from({ length: 256 }, (_, index) => index)
  let swap = 0

  for (let index = 0; index < 256; index += 1) {
    swap = (box[index] + swap + keyData[index % keyData.length]) & 0xff
    ;[box[index], box[swap]] = [box[swap], box[index]]
  }

  return box
}

function decodeMeta(metaChunk) {
  const xorBuffer = Buffer.from(metaChunk.map((byte) => byte ^ 0x63))
  const base64Text = xorBuffer.toString('utf8').slice(22)
  const encryptedMeta = Buffer.from(base64Text, 'base64')
  const decryptedMeta = aesDecrypt(encryptedMeta, META_KEY)
    .toString('utf8')
    .replace(/\0+$/, '')
    .slice(6)
  return JSON.parse(decryptedMeta)
}

function decodeAudio(audioChunk, keyBox) {
  const audioBuffer = Buffer.from(audioChunk)

  for (let offset = 0; offset < audioBuffer.length; offset += 1) {
    const index = (offset + 1) & 0xff
    const key = keyBox[(keyBox[index] + keyBox[(keyBox[index] + index) & 0xff]) & 0xff]
    audioBuffer[offset] ^= key
  }

  return audioBuffer
}

function parseArtists(artists) {
  if (!Array.isArray(artists)) {
    return ''
  }

  return artists.map((artist) => artist[0]).filter(Boolean).join(' / ')
}

async function decodeNcmFile(filePath) {
  const fileBuffer = await fs.readFile(filePath)

  if (!fileBuffer.subarray(0, 8).equals(MAGIC)) {
    throw new Error('不是有效的 NCM 文件')
  }

  let offset = 10

  const keyLength = fileBuffer.readUInt32LE(offset)
  offset += 4
  const keyChunk = fileBuffer.subarray(offset, offset + keyLength)
  offset += keyLength
  const xorKeyChunk = Buffer.from(keyChunk.map((byte) => byte ^ 0x64))
  const decryptedKey = aesDecrypt(xorKeyChunk, CORE_KEY).subarray(17)
  const keyBox = buildKeyBox(decryptedKey)

  const metaLength = fileBuffer.readUInt32LE(offset)
  offset += 4
  const metaChunk = fileBuffer.subarray(offset, offset + metaLength)
  offset += metaLength
  const meta = decodeMeta(metaChunk)

  offset += 4
  offset += 5

  const coverLength = fileBuffer.readUInt32LE(offset)
  offset += 4
  const coverBuffer = fileBuffer.subarray(offset, offset + coverLength)
  offset += coverLength

  const audioChunk = fileBuffer.subarray(offset)
  const audioBuffer = decodeAudio(audioChunk, keyBox)

  return {
    audioBuffer,
    coverBuffer,
    meta: {
      title: meta.musicName || '',
      artist: parseArtists(meta.artist),
      album: meta.album || '',
      format: meta.format || 'mp3',
    },
  }
}

module.exports = {
  decodeNcmFile,
}
