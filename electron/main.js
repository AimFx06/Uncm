const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const { decodeNcmFile } = require('./ncmDecoder')
const { convertDecodedAudio } = require('./converter')

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 760,
    backgroundColor: '#eef5ff',
    title: 'Uncm',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    return
  }

  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

function emitProgress(event, payload) {
  event.sender.send('convert:progress', payload)
}

async function handleConvert(event, { tasks, outputDir, bitrate }) {
  const results = []

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index]

    try {
      emitProgress(event, {
        taskId: task.id,
        status: 'processing',
        progress: 5,
        detail: '正在解析 NCM 文件',
      })

      const decoded = await decodeNcmFile(task.path)

      emitProgress(event, {
        taskId: task.id,
        status: 'processing',
        progress: 30,
        detail: '正在提取音频与元数据',
      })

      const outputPath = await convertDecodedAudio({
        ...decoded,
        sourcePath: task.path,
        outputDir,
        bitrate,
        onProgress: (_stage, progress, detail) => {
          emitProgress(event, {
            taskId: task.id,
            status: 'processing',
            progress,
            detail,
          })
        },
      })

      emitProgress(event, {
        taskId: task.id,
        status: 'success',
        progress: 100,
        detail: `已输出到 ${outputPath}`,
      })

      results.push({ taskId: task.id, success: true, outputPath })
    } catch (error) {
      emitProgress(event, {
        taskId: task.id,
        status: 'error',
        progress: 0,
        detail: error.message || '转换失败',
      })

      results.push({ taskId: task.id, success: false, error: error.message || '转换失败' })
    }
  }

  return results
}

function registerIpcHandlers() {
  ipcMain.handle('dialog:select-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'NCM 文件', extensions: ['ncm'] }],
    })

    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:select-output-dir', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })

    return result.canceled ? '' : result.filePaths[0] ?? ''
  })

  ipcMain.handle('convert:start', (event, payload) => handleConvert(event, payload))
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
