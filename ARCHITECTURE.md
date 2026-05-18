# Hard Boiled - Architecture Decisions

## Stack and platform choices
- **Vite + React** was used for fast client-side delivery and straightforward mobile-first rendering.
- **Firebase Realtime Database (client SDK only)** provides shared persistence and real-time sync without running a custom backend server.
- **PWA support** is provided with a web manifest, a service worker, and iOS install metadata (including `apple-touch-icon`).

## Shared room model (no auth)
- Room identity is URL-based via `?room=<roomId>`.
- If no room exists in the URL, one is generated and written to browser history for easy sharing.
- User identity is local-only (`name` + `userId`) stored in `localStorage` per room.
- This matches the requirement: no accounts, no passwords, and both players sync inside the same room key.

## Data schema (Realtime Database)

```json
rooms/{roomId}: {
  "roomId": "abc123xy",
  "updatedAt": 1715999999999,
  "users": {
    "{userId}": {
      "id": "user-uuid",
      "name": "Player Name",
      "tasks": [
        { "id": "task-id", "text": "Workout 30 min" }
      ],
      "progress": {
        "startDate": "2026-05-18",
        "extraDays": 2,
        "lastEvaluatedDate": "2026-05-24"
      },
      "daily": {
        "2026-05-25": {
          "task-id": true
        }
      },
      "updatedAt": 1716000000000
    }
  }
}
```

## Challenge/streak logic
- Each player defines their own task list.
- Daily completion is task-level checkbox data keyed by date.
- The tracker computes missed days once per day (up to yesterday): each missed day adds `+1` to `extraDays`, extending the total beyond 75.
- Shared room cards show each player's:
  - current day (`elapsed days from start` bounded by `75 + extraDays`)
  - streak (consecutive fully completed days)
  - today completion summary

## Operational notes
- Create `.env` from `.env.example` and provide Firebase values.
- Configure Firebase Realtime Database rules to allow room reads/writes for this prototype.
- For production, tighten security rules (for example by room invite tokens or anonymous auth constraints).
