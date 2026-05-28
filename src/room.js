export function getRecentRooms() {
  try {
    return JSON.parse(localStorage.getItem('hard-boiled:recent-rooms') ?? '[]')
  } catch {
    return []
  }
}

export function saveRecentRoom(roomId) {
  localStorage.setItem('hard-boiled:last-room', roomId)
  const recent = [roomId, ...getRecentRooms().filter((r) => r !== roomId)].slice(0, 3)
  localStorage.setItem('hard-boiled:recent-rooms', JSON.stringify(recent))
}

export function getLastRoom() {
  return localStorage.getItem('hard-boiled:last-room') ?? null
}

export function storageKeys(roomId) {
  return {
    name: `hard-boiled:name:${roomId}`,
    userId: `hard-boiled:user-id:${roomId}`,
  }
}

export function validateJoinCode(code) {
  const trimmed = code.trim().toLowerCase()
  if (!trimmed) return { valid: false, error: '' }
  if (trimmed.length < 4) return { valid: false, error: 'Room code looks too short — check the link and try again.' }
  return { valid: true, code: trimmed }
}
