import { getUserStats } from './challenge'

function getProgressEmoji(currentDay, totalDays) {
  const pct = currentDay / totalDays
  if (pct >= 1)   return '🐔'
  if (pct >= 0.7) return '🐥'
  if (pct >= 0.4) return '🐤'
  if (pct >= 0.1) return '🐣'
  return '🥚'
}

// Stagger vertically so emojis don't overlap when close together
const LANES = ['60%', '80%']

export function RaceTrack({ users }) {
  if (!users || users.length === 0) return null

  return (
    <div className="race-track-wrap" aria-label="Race track progress">
      <div className="race-track">
        {/* Lane lines */}
        <div className="track-lane-line" style={{ top: '20%' }} />
        <div className="track-lane-line" style={{ top: '40%' }} />
        <div className="track-lane-line" style={{ top: '60%' }} />
        <div className="track-lane-line" style={{ top: '80%' }} />

        {/* Finish flag */}
        <div className="track-finish">🏁</div>

        {/* Background horses — static, randomly placed */}
        <div className="track-horse horse-1">🏇</div>
        <div className="track-horse horse-2">🏇</div>

        {/* Racers */}
        {users.map((user, i) => {
          const stats = getUserStats(user)
          const pct = Math.min(stats.currentDay / stats.totalDays, 1)
          // leave 8% margin on left so emoji isn't clipped at start
          const leftPct = 8 + pct * 82
          const top = LANES[i % LANES.length]

          return (
            <div
              key={user.id}
              className="racer"
              style={{ left: `${leftPct}%`, top }}
              title={`${user.name}: Day ${stats.currentDay}/${stats.totalDays}`}
            >
              <span className="racer-emoji">{getProgressEmoji(stats.currentDay, stats.totalDays)}</span>
              <span className="racer-name">{user.name}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="track-legend">
        {users.map((user) => {
          const stats = getUserStats(user)
          return (
            <span key={user.id} className="track-legend-item">
              {getProgressEmoji(stats.currentDay, stats.totalDays)} {user.name} — Day {stats.currentDay}/{stats.totalDays}
            </span>
          )
        })}
      </div>
    </div>
  )
}
