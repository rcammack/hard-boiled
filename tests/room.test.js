import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getRecentRooms, saveRecentRoom, getLastRoom, storageKeys, validateJoinCode } from '../src/room'

// ── mock localStorage ──────────────────────────────────────────────────────

beforeEach(() => {
  const store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
    removeItem: (k) => { delete store[k] },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
  })
})

// ── getRecentRooms ─────────────────────────────────────────────────────────

describe('getRecentRooms', () => {
  it('returns empty array when nothing stored', () => {
    expect(getRecentRooms()).toEqual([])
  })

  it('returns stored rooms', () => {
    localStorage.setItem('hard-boiled:recent-rooms', JSON.stringify(['abc12345', 'def67890']))
    expect(getRecentRooms()).toEqual(['abc12345', 'def67890'])
  })

  it('returns empty array on corrupt data', () => {
    localStorage.setItem('hard-boiled:recent-rooms', 'not-json')
    expect(getRecentRooms()).toEqual([])
  })
})

// ── saveRecentRoom ─────────────────────────────────────────────────────────

describe('saveRecentRoom', () => {
  it('saves to last-room', () => {
    saveRecentRoom('abc12345')
    expect(getLastRoom()).toBe('abc12345')
  })

  it('prepends new room to recent list', () => {
    saveRecentRoom('room0001')
    saveRecentRoom('room0002')
    expect(getRecentRooms()[0]).toBe('room0002')
  })

  it('deduplicates — re-joining moves room to front', () => {
    saveRecentRoom('room0001')
    saveRecentRoom('room0002')
    saveRecentRoom('room0001')
    const rooms = getRecentRooms()
    expect(rooms[0]).toBe('room0001')
    expect(rooms.filter((r) => r === 'room0001').length).toBe(1)
  })

  it('caps recent list at 3 entries', () => {
    saveRecentRoom('room0001')
    saveRecentRoom('room0002')
    saveRecentRoom('room0003')
    saveRecentRoom('room0004')
    expect(getRecentRooms().length).toBe(3)
    expect(getRecentRooms()[0]).toBe('room0004')
  })
})

// ── storageKeys ────────────────────────────────────────────────────────────

describe('storageKeys', () => {
  it('returns namespaced keys for a room', () => {
    const keys = storageKeys('abc12345')
    expect(keys.name).toBe('hard-boiled:name:abc12345')
    expect(keys.userId).toBe('hard-boiled:user-id:abc12345')
  })
})

// ── validateJoinCode ───────────────────────────────────────────────────────

describe('validateJoinCode', () => {
  it('rejects empty input', () => {
    expect(validateJoinCode('').valid).toBe(false)
    expect(validateJoinCode('   ').valid).toBe(false)
  })

  it('rejects codes shorter than 4 chars with an error message', () => {
    const result = validateJoinCode('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('accepts codes of 4+ chars', () => {
    const result = validateJoinCode('abcd')
    expect(result.valid).toBe(true)
    expect(result.code).toBe('abcd')
  })

  it('trims whitespace and lowercases the code', () => {
    const result = validateJoinCode('  ABC12345  ')
    expect(result.valid).toBe(true)
    expect(result.code).toBe('abc12345')
  })
})
