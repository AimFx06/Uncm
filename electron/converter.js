const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
const NodeID3 = require('node-id3')

ffmpeg.setFfmpegPath(ffmpegPath)

function sanitizeFileName(fileName) {
  return fileName.replace(/[<>:"/\\|?*]/g, '_').trim()
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureUniqueOutputPath(outputDir, baseName) {
  let index = 0

  while (true) {
    const suffix = index === 0 ? '' : ` (${index})`
    const candidatePath = path.join(outputDir, `${baseName}${suffix}.mp3`)
    if (!(await pathExists(candidatePath))) {
      return candidatePath
    }
    index += 1
  }
}

function writeAudioFile(filePath, buffer) {
  return fs.writeFile(filePath, buffer)
}

function convertToMp3(inputPath, outputPath, bitrate, onProgress) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate(bitrate)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('progress', (progress) => {
        const percent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)))
        onProgress(percent)
      })
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath)
  })
}

function writeTags(outputPath, meta, coverBuffer) {
  const tags = {
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
  }

  if (coverBuffer?.length) {
    tags.image = {
      mime: 'image/jpeg',
      type: {
        id: 3,
        name: 'front cover',
      },
      imageBuffer: coverBuffer,
      description: 'cover',
    }
  }

  return new Promise((resolve, reject) => {
    NodeID3.write(tags, outputPath, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function convertDecodedAudio({ audioBuffer, coverBuffer, meta, sourcePath, outputDir, bitrate, onProgress }) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ncm-converter-'))
  const sourceName = sanitizeFileName(meta.title || path.parse(sourcePath).name || 'output')
  const tempInputPath = path.join(tempDir, `input.${meta.format || 'mp3'}`)
  const outputPath = await ensureUniqueOutputPath(outputDir, sourceName)

  try {
    await writeAudioFile(tempInputPath, audioBuffer)
    onProgress('transcoding', 45, '正在转码为 MP3')

    await convertToMp3(tempInputPath, outputPath, bitrate, (percent) => {
      const mappedPercent = Math.max(45, Math.min(92, 45 + Math.round(percent * 0.47)))
      onProgress('transcoding', mappedPercent, '正在转码为 MP3')
    })

    onProgress('tagging', 96, '正在写入歌曲信息')
    await writeTags(outputPath, meta, coverBuffer)

    return outputPath
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

module.exports = {
  convertDecodedAudio,
}
