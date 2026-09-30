import { useRef, useState } from 'react'

export default function SettingsPanel({
  outputDir,
  qualities,
  selectedQuality,
  selectedFileCount,
  canMutateTasks,
  onSelectQuality,
  onPickFiles,
  onDropFiles,
  onPickOutputDir,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  function collectNcmFiles(fileList) {
    return Array.from(fileList)
      .filter((file) => /\.ncm$/i.test(file.name))
      .map((file) => file.path)
      .filter(Boolean)
  }

  function handleDragOver(event) {
    event.preventDefault()

    if (canMutateTasks) {
      setIsDragging(true)
    }
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    if (!canMutateTasks) {
      return
    }

    const filePaths = collectNcmFiles(event.dataTransfer.files)
    onDropFiles(filePaths)
  }

  function handleChange(event) {
    const filePaths = collectNcmFiles(event.target.files)
    onDropFiles(filePaths)
    event.target.value = ''
  }

  return (
    <section className="settings-card">
      <div className="section-heading">
        <p className="eyebrow">主操作卡片</p>
        <h2>转换设置</h2>
        <p>选择音质、导入 NCM 文件，并设置 MP3 输出目录。</p>
      </div>

      <div className="quality-panel">
        <label className="field-label">音质选择</label>
        <div className="chip-group">
          {qualities.map((quality) => (
            <button
              key={quality}
              type="button"
              className={quality === selectedQuality ? 'chip-button active' : 'chip-button'}
              onClick={() => onSelectQuality(quality)}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>

      <div className="operation-grid">
        <article
          className={isDragging ? 'operation-panel file-panel dragging' : 'operation-panel file-panel'}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            className="hidden-input"
            type="file"
            accept=".ncm"
            multiple
            onChange={handleChange}
          />
          <div className="panel-title-row">
            <h3>选择文件</h3>
            <span>{selectedFileCount} 个</span>
          </div>
          <strong>已选择 {selectedFileCount} 个文件</strong>
          <p>支持 .ncm 文件，支持批量导入。</p>
          <button type="button" className="primary-button" onClick={onPickFiles} disabled={!canMutateTasks}>
            选择文件
          </button>
        </article>

        <article className="operation-panel directory-panel">
          <div className="panel-title-row">
            <h3>输出目录</h3>
          </div>
          <strong>当前输出目录</strong>
          <p className={outputDir ? 'directory-value selected' : 'directory-value'}>
            {outputDir || '请选择 MP3 保存位置'}
          </p>
          <button type="button" className="secondary-button" onClick={onPickOutputDir}>
            选择目录
          </button>
          <p>转换后的 MP3 将保存到这里。</p>
        </article>
      </div>
    </section>
  )
}
