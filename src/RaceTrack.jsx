import { useMemo } from 'react'
import { getUserStats } from './challenge'

const MAX_USERS = 10
const LANE_HEIGHT_PX = 50   // px per lane
const TRACK_MIN_HEIGHT = 80 // px

function getProgressEmoji(currentDay, totalDays) {
  const pct = currentDay / totalDays
  if (pct >= 1)   return '🐔'
  if (pct >= 0.7) return '🐥'
  if (pct >= 0.4) return '🐤'
  if (pct >= 0.1) return '🐣'
  return '🥚'
}

// Seeded pseudo-random so horse positions are stable across renders
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function RaceTrack({ users }) {
  if (!users || users.length === 0) return null

  const clampedUsers = users.slice(0, MAX_USERS)
  const userCount = clampedUsers.length

  // Build lane layout: interleave horse lanes between user lanes
  // e.g. 2 users → [user, horse, user, horse] = 4 lanes
  // Each user gets a dedicated lane; horses fill gaps
  const lanes = useMemo(() => {
    const rand = seededRandom(userCount * 31337)
    const result = []
    for (let i = 0; i < userCount; i++) {
      result.push({ type: 'user', index: i })
      if (i < userCount - 1 || userCount === 1) {
        if (rand() < 0.7) {
          result.push({ type: 'horse', left: Math.round(15 + rand() * 65) })
        }
      }
    }
    // Ensure at least 2 horses
    const horseCount = result.filter((l) => l.type === 'horse').length
    for (let h = horseCount; h < 2; h++) {
      const left = Math.round(15 + rand() * 65)
      const insertAt = Math.floor(rand() * (result.length + 1))
      result.splice(insertAt, 0, { type: 'horse', left })
    }
    return result
  }, [userCount])

  const totalLanes = lanes.length
  const trackHeight = Math.max(TRACK_MIN_HEIGHT, totalLanes * LANE_HEIGHT_PX)

  // Convert lane index to top % position (centered in lane)
  const laneTop = (i) => `${((i + 0.5) / totalLanes) * 100}%`

  return (
    <div className="race-track-wrap" aria-label="Race track progress">
      <div className="race-track" style={{ height: trackHeight }}>
        {/* Lane lines */}
        {lanes.map((_, i) => (
          <div key={i} className="track-lane-line" style={{ top: laneTop(i) }} />
        ))}

        {/* Finish flag */}
        <div className="track-finish">🏁</div>

        {/* Render each lane */}
        {lanes.map((lane, i) => {
          const top = laneTop(i)
          if (lane.type === 'horse') {
            return (
              <div key={`horse-${i}`} className="track-horse" style={{ left: `${lane.left}%`, top }}>
                🏇
              </div>
            )
          }
          const user = clampedUsers[lane.index]
          const stats = getUserStats(user)
          const pct = Math.min(stats.currentDay / stats.totalDays, 1)
          const leftPct = 8 + pct * 82
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
        {clampedUsers.map((user) => {
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
