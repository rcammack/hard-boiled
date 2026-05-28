import { useEffect, useMemo, useState } from 'react'
import { onValue, ref, set, update } from 'firebase/database'
import './App.css'
import { CalendarModal } from './CalendarModal'
import { RaceTrack } from './RaceTrack'
import { createTaskList, getDateKey, getUserStats, reconcileMissedDays } from './challenge'
import { database, isFirebaseConfigured } from './firebase'
import { generateId } from './id'
import { getLastRoom, getRecentRooms, saveRecentRoom, storageKeys, validateJoinCode } from './room'

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return generateId('user')
}

function Barn() {
  return (
    <svg width="52" height="56" viewBox="0 0 52 56" aria-hidden="true" className="barn-svg">
      <polygon points="0,24 26,0 52,24" fill="#7B1818" />
      <polygon points="18,24 26,16 34,24" fill="#5C1010" />
      <rect x="2" y="23" width="48" height="33" fill="#A83232" />
      <rect x="5" y="27" width="11" height="11" rx="1" fill="#6B3A1F" />
      <rect x="36" y="27" width="11" height="11" rx="1" fill="#6B3A1F" />
      <rect x="18" y="37" width="16" height="19" rx="2" fill="#6B3A1F" />
    </svg>
  )
}

function FarmScene() {
  return (
    <div className="farm-scene" aria-hidden="true">
      <span className="farm-item" style={{ fontSize: '1.6rem' }}>🌾</span>
      <span className="farm-item" style={{ fontSize: '2rem' }}>🌻</span>
      <span className="farm-item" style={{ fontSize: '2.2rem' }}>🐄</span>
      <span className="farm-item" style={{ fontSize: '1.5rem' }}>🌿</span>
      <Barn />
      <span className="farm-item" style={{ fontSize: '1.5rem' }}>🌿</span>
      <span className="farm-item" style={{ fontSize: '2.2rem' }}>🐄</span>
      <span className="farm-item" style={{ fontSize: '1.8rem' }}>🐓</span>
      <span className="farm-item" style={{ fontSize: '1.6rem' }}>🌾</span>
      <span className="farm-item" style={{ fontSize: '2rem' }}>🌻</span>
    </div>
  )
}

function getProgressEmoji(currentDay, totalDays) {
  const pct = currentDay / totalDays
  if (pct < 0.2) return '🥚'
  if (pct < 0.4) return '🐣'
  if (pct < 0.67) return '🐤'
  if (pct < 0.87) return '🐥'
  return '🐔'
}

function getRoomIdFromUrl() {
  return new URL(window.location.href).searchParams.get('room') ?? null
}

function setRoomInUrl(roomId) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  window.history.replaceState({}, '', url)
}

function clearRoomFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.replaceState({}, '', url)
}

function getInitialRoomId() {
  return getRoomIdFromUrl() ?? getLastRoom()
}


function App() {
  const [roomId, setRoomId] = useState(() => getInitialRoomId())
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [roomData, setRoomData] = useState({ users: {} })
  const [nameInput, setNameInput] = useState('')
  const [taskInput, setTaskInput] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const keys = useMemo(() => storageKeys(roomId ?? ''), [roomId])

  const [userId, setUserId] = useState(() => localStorage.getItem(keys.userId) ?? '')
  const [name, setName] = useState(() => localStorage.getItem(keys.name) ?? '')
  const [joiningAsNew, setJoiningAsNew] = useState(false)

  const [loading, setLoading] = useState(!!roomId && isFirebaseConfigured)

  const enterRoom = (id) => {
    setRoomInUrl(id)
    saveRecentRoom(id)
    setRoomId(id)
    setLoading(isFirebaseConfigured)
  }

  const leaveRoom = () => {
    localStorage.removeItem('hard-boiled:last-room')
    clearRoomFromUrl()
    setRoomId(null)
    setRoomData({ users: {} })
    setName('')
    setUserId('')
    setLoading(false)
  }

  useEffect(() => {
    if (roomId) saveRecentRoom(roomId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createRoom = () => {
    const id = generateId('room').slice(-8)
    enterRoom(id)
  }

  const joinRoom = (e) => {
    e.preventDefault()
    const result = validateJoinCode(joinInput)
    if (!result.valid) {
      if (result.error) setJoinError(result.error)
      return
    }
    setJoinError('')
    enterRoom(result.code)
  }

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured || !database) {
      return undefined
    }

    const roomRef = ref(database, `rooms/${roomId}`)

    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.val() ?? { users: {} })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    if (!isFirebaseConfigured || !database || !name || !userId) {
      return
    }

    const now = new Date().toISOString()
    update(ref(database, `rooms/${roomId}`), {
      updatedAt: now,
      roomId,
    })

    update(ref(database, `rooms/${roomId}/users/${userId}`), {
      id: userId,
      name,
      updatedAt: now,
    })
  }, [name, roomId, userId])

  const users = Object.values(roomData.users ?? {})
  const currentUser = useMemo(
    () => roomData.users?.[userId] ?? { tasks: [], progress: {}, daily: {} },
    [roomData.users, userId],
  )
  const todayKey = getDateKey()

  useEffect(() => {
    if (!isFirebaseConfigured || !database || !userId || !name) {
      return
    }

    const updates = reconcileMissedDays(currentUser)
    if (!updates) {
      return
    }

    update(ref(database, `rooms/${roomId}/users/${userId}/progress`), updates)
  }, [currentUser, name, roomId, userId])

  const saveName = (event) => {
    event.preventDefault()
    const value = nameInput.trim()

    if (!value) {
      return
    }

    const resolvedUserId = userId || randomId()

    localStorage.setItem(keys.name, value)
    localStorage.setItem(keys.userId, resolvedUserId)

    setName(value)
    setUserId(resolvedUserId)
    setNameInput('')
    setJoiningAsNew(false)
  }

  const joinAsExisting = (existingUser) => {
    localStorage.setItem(keys.name, existingUser.name)
    localStorage.setItem(keys.userId, existingUser.id)
    setName(existingUser.name)
    setUserId(existingUser.id)
  }

  const saveChallenge = (event) => {
    event.preventDefault()
    if (!isFirebaseConfigured || !database) {
      return
    }

    const taskLines = taskInput.split('\n')
    const tasks = createTaskList(taskLines)

    if (tasks.length === 0) {
      return
    }

    const now = new Date().toISOString()

    set(ref(database, `rooms/${roomId}/users/${userId}`), {
      ...currentUser,
      id: userId,
      name,
      tasks,
      progress: {
        startDate: currentUser.progress?.startDate ?? todayKey,
        extraDays: currentUser.progress?.extraDays ?? 0,
        lastEvaluatedDate: currentUser.progress?.lastEvaluatedDate ?? null,
      },
      daily: currentUser.daily ?? {},
      updatedAt: now,
    })

    setTaskInput('')
  }

  const toggleTask = (taskId) => {
    if (!isFirebaseConfigured || !database) {
      return
    }

    const currentValue = currentUser.daily?.[todayKey]?.[taskId] === true

    update(ref(database, `rooms/${roomId}/users/${userId}`), {
      [`daily/${todayKey}/${taskId}`]: !currentValue,
      updatedAt: new Date().toISOString(),
    })
  }

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('Copied room link')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <>
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>🥚 Hard Boiled</h1>
          <p>75 Day Hard challenge tracker</p>
        </div>
        {roomId && (
          <button type="button" onClick={copyRoomLink} className="secondary-btn">
            Share room
          </button>
        )}
      </header>

      {copyStatus && <p className="status-pill">{copyStatus}</p>}

      {!isFirebaseConfigured && (
        <section className="panel warning">
          <h2>Firebase setup required</h2>
          <p>Add VITE_FIREBASE_* variables to run shared sync for this room.</p>
        </section>
      )}

      {!roomId ? (
        <section className="panel landing-panel">
          <h2>Welcome to Hard Boiled 🥚</h2>
          <button type="button" className="landing-btn" onClick={createRoom}>
            🐣 Create new room
          </button>
          <div className="divider">or</div>
          <form onSubmit={joinRoom} className="form-stack join-form">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => { setJoinInput(e.target.value); setJoinError('') }}
              placeholder="Enter room code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {joinError && <p className="join-error">{joinError}</p>}
            <button type="submit">Join room</button>
          </form>
          {getRecentRooms().length > 0 && (
            <>
              <p className="recent-label">Recent rooms</p>
              <div className="recent-rooms">
                {getRecentRooms().map((r) => (
                  <button key={r} type="button" className="secondary-btn" onClick={() => enterRoom(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : loading ? (
        <section className="panel loader-panel">
          <div className="egg-loader">🥚</div>
          <p>Hatching your challenge...</p>
        </section>
      ) : !name ? (
        <section className="panel">
          {users.length > 0 && !joiningAsNew ? (
            <>
              <h2>Who are you?</h2>
              <div className="player-grid">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="player-select-btn"
                    onClick={() => joinAsExisting(user)}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
              <button type="button" className="secondary-btn" onClick={() => setJoiningAsNew(true)}>
                Join as new person
              </button>
            </>
          ) : (
            <>
              <h2>Choose your player name</h2>
              <form onSubmit={saveName} className="form-stack">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Your name"
                  maxLength={24}
                  required
                />
                <button type="submit">Continue</button>
              </form>
              {users.length > 0 && (
                <button type="button" className="secondary-btn" onClick={() => setJoiningAsNew(false)}>
                  ← Back
                </button>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          {!currentUser.tasks?.length ? (
            <section className="panel">
              <h2>Build your 75-day rules</h2>
              <p>Add one daily rule per line.</p>
              <form onSubmit={saveChallenge} className="form-stack">
                <textarea
                  value={taskInput}
                  onChange={(event) => setTaskInput(event.target.value)}
                  placeholder={'Workout 30 min\nRead 10 pages\nStudy Japanese'}
                  rows={6}
                  required
                />
                <button type="submit" disabled={!isFirebaseConfigured}>
                  Save challenge
                </button>
              </form>
            </section>
          ) : (
            <section className="panel">
              <div className="checklist-header">
                <h2>Today&apos;s checklist ({name})</h2>
                <button
                  type="button"
                  className="secondary-btn icon-btn"
                  onClick={() => setCalendarOpen(true)}
                  aria-label="Open calendar"
                >
                  📅
                </button>
              </div>
              <ul className="task-list">
                {currentUser.tasks.map((task) => {
                  const checked = currentUser.daily?.[todayKey]?.[task.id] === true
                  return (
                    <li key={task.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(task.id)}
                        />
                        <span>{task.text}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="panel">
            <h2>Room progress</h2>
            <p className="room-id">Room: {roomId}</p>
            <RaceTrack users={users} />
            <div className="player-grid">
              {users.length === 0 && <p>No players synced yet.</p>}
              {users.map((user) => {
                const stats = getUserStats(user)
                return (
                  <article key={user.id} className="player-card">
                    <div className="player-card-emoji" aria-hidden="true">
                      {getProgressEmoji(stats.currentDay, stats.totalDays)}
                    </div>
                    <h3>{user.name}</h3>
                    <p>Day {stats.currentDay} / {stats.totalDays}</p>
                    <p>Streak: {stats.streak} days</p>
                    <p>Today: {stats.todayProgressText}{stats.completeToday ? ' ✅' : ''}</p>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
      {calendarOpen && (
        <CalendarModal
          user={currentUser}
          roomId={roomId}
          userId={userId}
          database={database}
          isFirebaseConfigured={isFirebaseConfigured}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {roomId && !loading && (
        <div className="leave-room-wrap">
          <button type="button" className="secondary-btn leave-btn" onClick={leaveRoom}>
            Leave room
          </button>
        </div>
      )}
    </main>
    <FarmScene />
    </>
  )
}

export default App
