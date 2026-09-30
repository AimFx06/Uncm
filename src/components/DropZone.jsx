import { useRef, useState } from 'react'

export default function DropZone({ onPickFiles, onDropFiles }) {
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
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    const filePaths = collectNcmFiles(event.dataTransfer.files)
    onDropFiles(filePaths)
  }

  function handleChange(event) {
    const filePaths = collectNcmFiles(event.target.files)
    onDropFiles(filePaths)
    event.target.value = ''
  }

  return (
    <section
      className={isDragging ? 'dropzone-card dragging' : 'dropzone-card'}
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
      <div className="dropzone-icon">♪</div>
      <h2>拖拽 NCM 文件到这里</h2>
      <p>或点击下方按钮选择文件，支持批量导入。</p>
      <div className="dropzone-actions">
        <div className="button-row">
          <button type="button" className="primary-button" onClick={onPickFiles}>
            选择文件
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => inputRef.current?.click()}
          >
            本地拖拽测试
          </button>
        </div>
        <span className="dropzone-hint">仅支持 .ncm 文件，重复文件会自动忽略</span>
      </div>
    </section>
  )
}
