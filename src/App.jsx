import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import SettingsPanel from './components/SettingsPanel'
import TaskList from './components/TaskList'
import StatusBar from './components/StatusBar'

const qualities = ['128k', '192k', '320k']

function createTask(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const parts = normalizedPath.split('/')
  const name = parts[parts.length - 1] || filePath

  return {
    id: `${filePath}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    path: filePath,
    name,
    status: 'waiting',
    progress: 0,
    detail: '等待开始转换',
  }
}

function dedupeTasks(currentTasks, filePaths) {
  const knownPaths = new Set(currentTasks.map((task) => task.path))
  const incomingTasks = filePaths
    .filter((filePath) => /\.ncm$/i.test(filePath) && !knownPaths.has(filePath))
    .map(createTask)

  return [...currentTasks, ...incomingTasks]
}

function downloadFailureList(failedTasks) {
  const content = failedTasks.map((task) => `${task.name}\t${task.detail}`).join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '失败列表.txt'
  link.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [tasks, setTasks] = useState([])
  const [selectedQuality, setSelectedQuality] = useState('320k')
  const [outputDir, setOutputDir] = useState('')
  const [notice, setNotice] = useState('请选择 NCM 文件并设置输出目录。')
  const [isConverting, setIsConverting] = useState(false)

  useEffect(() => {
    const dispose = window.electronAPI.onConvertProgress((payload) => {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === payload.taskId
            ? {
                ...task,
                status: payload.status,
                progress: payload.progress,
                detail: payload.detail,
              }
            : task,
        ),
      )
    })

    return dispose
  }, [])

  const failedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'error'),
    [tasks],
  )

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'success').length,
    [tasks],
  )

  const overallProgress = useMemo(() => {
    if (tasks.length === 0) {
      return 0
    }

    const total = tasks.reduce((sum, task) => sum + task.progress, 0)
    return Math.round(total / tasks.length)
  }, [tasks])

  const hasTasks = tasks.length > 0
  const canStart = hasTasks && outputDir && !isConverting
  const canMutateTasks = !isConverting

  function mergeFilePaths(filePaths) {
    if (!filePaths.length) {
      return
    }

    setTasks((currentTasks) => {
      const nextTasks = dedupeTasks(currentTasks, filePaths)
      const addedCount = nextTasks.length - currentTasks.length

      if (addedCount === 0) {
        setNotice('未新增文件：重复文件或非 NCM 文件已自动忽略。')
        return currentTasks
      }

      setNotice(`已加入 ${addedCount} 个待转换文件。`)
      return nextTasks
    })
  }

  async function handlePickFiles() {
    if (!canMutateTasks) {
      return
    }

    const filePaths = await window.electronAPI.selectFiles()
    mergeFilePaths(filePaths)
  }

  async function handlePickOutputDir() {
    const selectedDir = await window.electronAPI.selectOutputDir()

    if (!selectedDir) {
      return
    }

    setOutputDir(selectedDir)
    setNotice('输出目录已更新，可以开始转换。')
  }

  function handleDropFiles(filePaths) {
    if (!canMutateTasks) {
      return
    }

    mergeFilePaths(filePaths)
  }

  function handleClearTasks() {
    if (isConverting) {
      return
    }

    setTasks([])
    setNotice('列表已清空。')
  }

  async function handleStartConvert() {
    if (!canStart) {
      setNotice('请先添加 NCM 文件并选择输出目录。')
      return
    }

    const queuedTasks = tasks.map((task, index) => ({
      ...task,
      status: 'waiting',
      progress: 0,
      detail: index === 0 ? '准备开始转换' : '等待前序任务完成',
    }))

    setTasks(queuedTasks)
    setIsConverting(true)
    setNotice(`正在转换，共 ${queuedTasks.length} 个文件，音质 ${selectedQuality}。`)

    const results = await window.electronAPI.startConvert({
      tasks: queuedTasks,
      outputDir,
      bitrate: selectedQuality,
    })

    const successCount = results.filter((result) => result.success).length
    const failureCount = results.length - successCount

    setIsConverting(false)
    setNotice(
      failureCount === 0
        ? `全部转换完成，共成功 ${successCount} 个文件。`
        : `转换完成，成功 ${successCount} 个，失败 ${failureCount} 个。`,
    )
  }

  function handleExportFailures() {
    if (failedTasks.length === 0) {
      return
    }

    downloadFailureList(failedTasks)
  }

  return (
    <div className="app-shell">
      <main className="app-container">
        <Header />
        <SettingsPanel
          outputDir={outputDir}
          qualities={qualities}
          selectedQuality={selectedQuality}
          selectedFileCount={tasks.length}
          canMutateTasks={canMutateTasks}
          onSelectQuality={setSelectedQuality}
          onPickFiles={handlePickFiles}
          onDropFiles={handleDropFiles}
          onPickOutputDir={handlePickOutputDir}
        />
        <StatusBar
          notice={notice}
          totalCount={tasks.length}
          completedCount={completedTasks}
          failedCount={failedTasks.length}
          overallProgress={overallProgress}
          canStart={canStart}
          hasTasks={hasTasks}
          isConverting={isConverting}
          onClearTasks={handleClearTasks}
          onStartConvert={handleStartConvert}
        />
        <TaskList
          tasks={tasks}
          failedCount={failedTasks.length}
          onExportFailures={handleExportFailures}
        />
      </main>
    </div>
  )
}
