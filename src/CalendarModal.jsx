import { useMemo, useState } from 'react'
import { ref, update } from 'firebase/database'
import { getDateKey } from './challenge'

function buildMonthCalendars(startDateKey, todayKey) {
  const [sy, sm] = startDateKey.split('-').map(Number)
  const [ty, tm] = todayKey.split('-').map(Number)
  const months = []
  let year = sy
  let month = sm

  while (year < ty || (year === ty && month <= tm)) {
    const label = new Date(year, month - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    })
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDow = new Date(year, month - 1, 1).getDay()
    const days = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }),
    ]
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push([...days.slice(i, i + 7), ...Array(7).fill(null)].slice(0, 7))
    }
    months.push({ label, weeks })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return months
}

function getDayStatus(user, dateKey, startDateKey, todayKey) {
  if (dateKey < startDateKey || dateKey > todayKey) return 'outside'
  const tasks = user.tasks ?? []
  if (tasks.length === 0) return 'no-tasks'
  const completed = tasks.filter((t) => user.daily?.[dateKey]?.[t.id] === true).length
  if (completed === tasks.length) return 'complete'
  if (completed > 0) return 'partial'
  return 'missed'
}

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('default', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function CalendarModal({ user, roomId, userId, database, isFirebaseConfigured, onClose }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const todayKey = getDateKey()
  const startDateKey = user.progress?.startDate

  const months = useMemo(() => {
    if (!startDateKey) return []
    return buildMonthCalendars(startDateKey, todayKey)
  }, [startDateKey, todayKey])

  const toggleTask = (dateKey, taskId) => {
    if (!isFirebaseConfigured || !database) return
    const current = user.daily?.[dateKey]?.[taskId] === true
    update(ref(database, `rooms/${roomId}/users/${userId}/daily/${dateKey}`), {
      [taskId]: !current,
    })
  }

  const tasks = user.tasks ?? []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{selectedDay ? formatDate(selectedDay) : '📅 Calendar'}</h2>
          <div className="modal-header-actions">
            {selectedDay && (
              <button type="button" className="secondary-btn" onClick={() => setSelectedDay(null)}>
                ← Back
              </button>
            )}
            <button type="button" className="secondary-btn modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {selectedDay ? (
          <div className="day-editor">
            {(() => {
              const completed = tasks.filter(
                (t) => user.daily?.[selectedDay]?.[t.id] === true,
              ).length
              return (
                <p className="day-summary">
                  {completed}/{tasks.length} tasks completed
                </p>
              )
            })()}
            <ul className="task-list">
              {tasks.map((task) => {
                const checked = user.daily?.[selectedDay]?.[task.id] === true
                return (
                  <li key={task.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTask(selectedDay, task.id)}
                        disabled={!isFirebaseConfigured}
                      />
                      <span>{task.text}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="calendar-scroll">
            {!startDateKey && <p>Start your challenge to see the calendar.</p>}
            <div className="calendar-legend">
              <span className="legend-dot complete" /> Complete
              <span className="legend-dot partial" /> Partial
              <span className="legend-dot missed" /> Missed
            </div>
            {months.map(({ label, weeks }) => (
              <div key={label} className="calendar-month">
                <h3 className="month-label">{label}</h3>
                <div className="calendar-grid">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="cal-dow">
                      {d}
                    </div>
                  ))}
                  {weeks.flat().map((dateKey, i) => {
                    if (!dateKey) return <div key={`empty-${i}`} className="cal-day cal-empty" />
                    const status = getDayStatus(user, dateKey, startDateKey, todayKey)
                    const clickable = status !== 'outside' && dateKey < todayKey
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`cal-day cal-${status}`}
                        onClick={() => clickable && setSelectedDay(dateKey)}
                        disabled={!clickable}
                        aria-label={`${dateKey}: ${status}`}
                      >
                        {parseInt(dateKey.split('-')[2], 10)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
