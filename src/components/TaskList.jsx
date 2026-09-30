function TaskItem({ task }) {
  const statusMap = {
    waiting: '等待中',
    processing: '转换中',
    success: '已完成',
    error: '失败',
  }

  return (
    <li className={`task-item ${task.status}`}>
      <div className="task-main">
        <div>
          <h4>{task.name}</h4>
          <p>{task.detail}</p>
        </div>
        <span className={`status-pill ${task.status}`}>{statusMap[task.status]}</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${task.progress}%` }} />
      </div>
      <div className="progress-meta">
        <span>{task.status === 'processing' ? '当前进度' : '状态'}</span>
        <strong>{task.status === 'processing' ? `${task.progress}%` : statusMap[task.status]}</strong>
      </div>
    </li>
  )
}

export default function TaskList({ tasks, failedCount, onExportFailures }) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <div className="section-heading compact">
          <p className="eyebrow">任务列表</p>
          <h2>待转换文件（{tasks.length}）</h2>
        </div>
        <button
          type="button"
          className="ghost-button"
          disabled={failedCount === 0}
          onClick={onExportFailures}
        >
          导出失败列表
        </button>
      </div>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <h3>还没有待转换文件</h3>
          <p>点击上方“选择文件”或拖入 .ncm 文件后，任务会显示在这里。</p>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  )
}
