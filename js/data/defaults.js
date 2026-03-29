/**
 * Default 4-day Upper/Lower workout plan.
 * Seeded automatically on first login when user has zero workouts.
 *
 * Exercise instances reference IDs from exercises.js.
 * order_position: 1–4, defines the rotation sequence.
 */

export const DEFAULT_WORKOUTS = [
  {
    name: 'Upper 1 — Strength',
    order_position: 1,
    exercises: [
      { exercise_id: 'incline-barbell-press',    sets: 4, rep_range: [4, 6]  },
      { exercise_id: 'weighted-pull-ups',         sets: 4, rep_range: [5, 8]  },
      { exercise_id: 'seated-db-shoulder-press',  sets: 3, rep_range: [6, 8]  },
      { exercise_id: 'chest-supported-row',       sets: 3, rep_range: [6, 8]  },
      { exercise_id: 'rope-pushdown',             sets: 3, rep_range: [10, 12] },
      { exercise_id: 'barbell-curl',              sets: 3, rep_range: [10, 12] },
    ],
  },
  {
    name: 'Lower 1 — Strength',
    order_position: 2,
    exercises: [
      { exercise_id: 'back-squat',          sets: 4, rep_range: [4, 6]  },
      { exercise_id: 'romanian-deadlift',   sets: 4, rep_range: [5, 7]  },
      { exercise_id: 'walking-lunges',      sets: 3, rep_range: [8, 8]  },
      { exercise_id: 'hanging-leg-raises',  sets: 3, rep_range: [8, 12] },
      { exercise_id: 'plank',               sets: 3, rep_range: [30, 60] },
    ],
  },
  {
    name: 'Upper 2 — Hypertrophy',
    order_position: 3,
    exercises: [
      { exercise_id: 'weighted-dips',              sets: 4, rep_range: [8, 12]  },
      { exercise_id: 'incline-dumbbell-press',     sets: 4, rep_range: [8, 12]  },
      { exercise_id: 'lat-pulldown',               sets: 4, rep_range: [8, 12]  },
      { exercise_id: 'lateral-raises',             sets: 4, rep_range: [12, 15] },
      { exercise_id: 'overhead-tricep-extension',  sets: 3, rep_range: [12, 15] },
      { exercise_id: 'hammer-curl',                sets: 3, rep_range: [12, 15] },
    ],
  },
  {
    name: 'Lower 2 — Hypertrophy',
    order_position: 4,
    exercises: [
      { exercise_id: 'leg-press',           sets: 4, rep_range: [10, 12] },
      { exercise_id: 'hip-thrust',          sets: 4, rep_range: [8, 12]  },
      { exercise_id: 'bulgarian-split-squat', sets: 3, rep_range: [8, 8]  },
      { exercise_id: 'leg-extension',       sets: 3, rep_range: [12, 15] },
      { exercise_id: 'hanging-leg-raises',  sets: 3, rep_range: [10, 15] },
      { exercise_id: 'cable-crunch',        sets: 3, rep_range: [10, 15] },
    ],
  },
];
