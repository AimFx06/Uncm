export default function StatusBar({
  notice,
  totalCount,
  completedCount,
  failedCount,
  overallProgress,
  canStart,
  hasTasks,
  isConverting,
  onClearTasks,
  onStartConvert,
}) {
  return (
    <section className="status-card">
      <div className="section-heading compact">
        <p className="eyebrow">整体进度</p>
        <h2>
          成功 {completedCount} 个，失败 {failedCount} 个
        </h2>
      </div>

      <div className="status-count-row">
        <span>总文件数 {totalCount}</span>
        <span>{notice}</span>
      </div>

      <div className="progress-track overall" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
      </div>

      <div className="status-percent-row">
        <strong>{overallProgress}%</strong>
      </div>

      <div className="action-row">
        <button type="button" className="ghost-button" onClick={onClearTasks} disabled={!hasTasks || isConverting}>
          清空列表
        </button>
        <button
          type="button"
          className="primary-button large"
          onClick={onStartConvert}
          disabled={!canStart}
        >
          {isConverting ? '转换中...' : '开始转换'}
        </button>
      </div>
    </section>
  )
}
