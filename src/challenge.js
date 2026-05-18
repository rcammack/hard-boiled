import { generateId } from './id'

const GOAL_DAYS = 75

export function getDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function dayDifference(startDateKey, endDateKey) {
  const startDate = fromDateKey(startDateKey)
  const endDate = fromDateKey(endDateKey)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate - startDate) / msPerDay)
}

function isTaskCompleteForDay(taskId, taskMapForDate) {
  return taskMapForDate?.[taskId] === true
}

export function isDayComplete(user, dateKey) {
  const taskIds = (user.tasks ?? []).map((task) => task.id)
  if (taskIds.length === 0) {
    return false
  }

  const taskMapForDate = user.daily?.[dateKey]
  return taskIds.every((taskId) => isTaskCompleteForDay(taskId, taskMapForDate))
}

export function reconcileMissedDays(user, today = new Date()) {
  const startDate = user.progress?.startDate
  if (!startDate || !Array.isArray(user.tasks) || user.tasks.length === 0) {
    return null
  }

  const yesterday = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), -1)
  const yesterdayKey = getDateKey(yesterday)

  const lastEvaluatedDate = user.progress?.lastEvaluatedDate
  let cursor = fromDateKey(startDate)

  if (lastEvaluatedDate) {
    cursor = addDays(fromDateKey(lastEvaluatedDate), 1)
  }

  if (cursor > yesterday) {
    return null
  }

  let extraDays = user.progress?.extraDays ?? 0

  while (cursor <= yesterday) {
    const dateKey = getDateKey(cursor)
    if (!isDayComplete(user, dateKey)) {
      extraDays += 1
    }
    cursor = addDays(cursor, 1)
  }

  const updates = {}
  if (extraDays !== (user.progress?.extraDays ?? 0)) {
    updates.extraDays = extraDays
  }

  if (lastEvaluatedDate !== yesterdayKey) {
    updates.lastEvaluatedDate = yesterdayKey
  }

  return Object.keys(updates).length > 0 ? updates : null
}

export function getUserStats(user, today = new Date()) {
  const todayKey = getDateKey(today)

  if (!user?.progress?.startDate) {
    return {
      currentDay: 1,
      totalDays: GOAL_DAYS,
      streak: 0,
      completeToday: false,
      todayProgressText: '0/0',
    }
  }

  const totalDays = GOAL_DAYS + (user.progress?.extraDays ?? 0)
  const elapsed = dayDifference(user.progress.startDate, todayKey) + 1
  const currentDay = Math.min(totalDays, Math.max(1, elapsed))

  let streak = 0
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  while (isDayComplete(user, getDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  const tasks = user.tasks ?? []
  const completedToday = tasks.filter((task) =>
    isTaskCompleteForDay(task.id, user.daily?.[todayKey]),
  ).length

  const completeToday = tasks.length > 0 && completedToday === tasks.length

  return {
    currentDay,
    totalDays,
    streak,
    completeToday,
    todayProgressText: `${completedToday}/${tasks.length}`,
  }
}

export function createTaskList(taskLines) {
  return taskLines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: generateId(`task-${index}`),
      text,
    }))
}
