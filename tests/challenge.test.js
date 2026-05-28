import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDateKey, getUserStats, reconcileMissedDays, isDayComplete } from '../src/challenge'

// ── helpers ────────────────────────────────────────────────────────────────

function makeUser({ startDate, extraDays = 0, lastEvaluatedDate, daily = {}, tasks }) {
  const defaultTasks = [
    { id: 'task-1', text: 'Task 1' },
    { id: 'task-2', text: 'Task 2' },
  ]
  return {
    id: 'user-1',
    name: 'Test',
    tasks: tasks ?? defaultTasks,
    progress: { startDate, extraDays, ...(lastEvaluatedDate ? { lastEvaluatedDate } : {}) },
    daily,
  }
}

function completedDay(dateKey, tasks = ['task-1', 'task-2']) {
  return { [dateKey]: Object.fromEntries(tasks.map((id) => [id, true])) }
}

function d(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return getDateKey(date)
}

const TODAY = d(0)
const YESTERDAY = d(-1)
const TWO_AGO = d(-2)
const THREE_AGO = d(-3)

// ── isDayComplete ──────────────────────────────────────────────────────────

describe('isDayComplete', () => {
  it('returns false when no daily data', () => {
    const user = makeUser({ startDate: TODAY })
    expect(isDayComplete(user, TODAY)).toBe(false)
  })

  it('returns false when only some tasks done', () => {
    const user = makeUser({
      startDate: TODAY,
      daily: { [TODAY]: { 'task-1': true, 'task-2': false } },
    })
    expect(isDayComplete(user, TODAY)).toBe(false)
  })

  it('returns true when all tasks done', () => {
    const user = makeUser({ startDate: TODAY, daily: completedDay(TODAY) })
    expect(isDayComplete(user, TODAY)).toBe(true)
  })
})

// ── getUserStats streak ────────────────────────────────────────────────────

describe('getUserStats - streak', () => {
  it('is 0 when no days completed', () => {
    const user = makeUser({ startDate: TWO_AGO })
    const stats = getUserStats(user)
    expect(stats.streak).toBe(0)
  })

  it('does not count today toward streak', () => {
    const user = makeUser({
      startDate: TWO_AGO,
      daily: completedDay(TODAY),
    })
    const stats = getUserStats(user)
    expect(stats.streak).toBe(0)
  })

  it('counts consecutive completed days ending yesterday', () => {
    const user = makeUser({
      startDate: THREE_AGO,
      daily: { ...completedDay(YESTERDAY), ...completedDay(TWO_AGO) },
    })
    const stats = getUserStats(user)
    expect(stats.streak).toBe(2)
  })

  it('breaks streak on a missed day', () => {
    const user = makeUser({
      startDate: THREE_AGO,
      daily: completedDay(YESTERDAY),
      // TWO_AGO not completed — streak should still be 1
    })
    const stats = getUserStats(user)
    expect(stats.streak).toBe(1)
  })
})

// ── getUserStats extraDays / totalDays ─────────────────────────────────────

describe('getUserStats - totalDays', () => {
  it('totalDays is 75 with no penalties', () => {
    const user = makeUser({ startDate: TODAY })
    expect(getUserStats(user).totalDays).toBe(75)
  })

  it('totalDays increases with extraDays penalty', () => {
    const user = makeUser({ startDate: TODAY, extraDays: 3 })
    expect(getUserStats(user).totalDays).toBe(78)
  })
})

// ── getUserStats todayProgress ─────────────────────────────────────────────

describe('getUserStats - today progress', () => {
  it('shows 0/2 when nothing done', () => {
    const user = makeUser({ startDate: TODAY })
    expect(getUserStats(user).todayProgressText).toBe('0/2')
  })

  it('shows 2/2 and completeToday when all done', () => {
    const user = makeUser({ startDate: TODAY, daily: completedDay(TODAY) })
    const stats = getUserStats(user)
    expect(stats.todayProgressText).toBe('2/2')
    expect(stats.completeToday).toBe(true)
  })
})

// ── reconcileMissedDays ────────────────────────────────────────────────────

describe('reconcileMissedDays', () => {
  it('returns null when no startDate', () => {
    const user = makeUser({ startDate: undefined })
    expect(reconcileMissedDays(user)).toBeNull()
  })

  it('returns null when startDate is today (nothing to evaluate yet)', () => {
    const user = makeUser({ startDate: TODAY })
    expect(reconcileMissedDays(user)).toBeNull()
  })

  it('adds extraDays for missed past days', () => {
    const user = makeUser({ startDate: TWO_AGO, extraDays: 0 })
    const updates = reconcileMissedDays(user)
    expect(updates.extraDays).toBe(2)
  })

  it('does not penalise retroactively completed days', () => {
    const user = makeUser({
      startDate: TWO_AGO,
      extraDays: 2,
      daily: { ...completedDay(YESTERDAY), ...completedDay(TWO_AGO) },
    })
    const updates = reconcileMissedDays(user)
    expect(updates.extraDays).toBe(0)
  })

  it('recalculates from scratch — retroactive fix reduces extraDays', () => {
    const user = makeUser({
      startDate: TWO_AGO,
      extraDays: 2,
      daily: completedDay(YESTERDAY), // TWO_AGO still missed
    })
    const updates = reconcileMissedDays(user)
    expect(updates.extraDays).toBe(1)
  })

  it('returns null when extraDays and lastEvaluatedDate are already correct', () => {
    const user = makeUser({
      startDate: TWO_AGO,
      extraDays: 2,
      lastEvaluatedDate: YESTERDAY,
    })
    expect(reconcileMissedDays(user)).toBeNull()
  })
})
