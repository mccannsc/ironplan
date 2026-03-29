// IronPlan Exercise Database

export const EXERCISES = [

  // ═══════════════════════════════════════
  // CHEST
  // ═══════════════════════════════════════
  {
    id: 'flat-barbell-bench-press',
    name: 'Flat Barbell Bench Press',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'shoulders', 'triceps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Grip just outside shoulder-width. Lower the bar to mid-chest under control, press to lockout. Retract and depress shoulder blades throughout.',
  },
  {
    id: 'incline-barbell-press',
    name: 'Incline Barbell Press',
    primary_muscle: 'chest_upper',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Set bench to 30–45°. Lower bar to upper chest. Keep elbows at ~75° to torso to protect the shoulder. Drive through the upper chest at the top.',
  },
  {
    id: 'flat-dumbbell-press',
    name: 'Flat Dumbbell Press',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'shoulders', 'triceps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Greater range of motion than barbell. Bring dumbbells slightly together at the top. Control the descent — do not let elbows flare wide.',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primary_muscle: 'chest_upper',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Bench at 30–45°. Press dumbbells up and slightly together. Excellent upper chest builder with full range of motion. Control the negative.',
  },
  {
    id: 'weighted-dips',
    name: 'Weighted Dips',
    primary_muscle: 'chest_lower',
    secondary_muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'bodyweight',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Lean forward to emphasise chest over triceps. Lower until upper arms are parallel to the floor. Add weight via belt once bodyweight is easy.',
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    primary_muscle: 'chest',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'machine',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Adjust seat so handles are at mid-chest height. Press to near-lockout without fully unloading the chest. Good for isolation and muscle-mind connection.',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'shoulders'],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Set cables at shoulder height. Keep a slight elbow bend throughout. Squeeze the chest as hands meet. Cables maintain tension at the fully contracted position.',
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper'],
    equipment: 'machine',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Adjust seat so elbows align with handles at chest height. Control the stretch — do not let the weight pull your arms too far back. Squeeze hard at the top.',
  },

  // ═══════════════════════════════════════
  // BACK
  // ═══════════════════════════════════════
  {
    id: 'pull-ups',
    name: 'Pull-Ups',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'bodyweight',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Pronated grip, shoulder-width. Initiate by depressing scapula, then pull elbows down and back. Full hang at the bottom. Chin clears the bar at the top.',
  },
  {
    id: 'weighted-pull-ups',
    name: 'Weighted Pull-Ups',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'bodyweight',
    pattern: 'pull',
    difficulty: 'advanced',
    description: 'Add load via belt, vest, or dumbbell between feet. Same technique as bodyweight pull-ups. Build to sets of 10 before adding weight.',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Wide pronated grip. Lean back slightly, pull bar to upper chest. Initiate with lat depression, not with biceps. Let arms fully extend at the top.',
  },
  {
    id: 'neutral-grip-pulldown',
    name: 'Neutral Grip Pulldown',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Use a neutral-grip attachment. Palms face each other. Pull elbows down and into the sides. Easier on the wrists and shoulders than wide-grip.',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    primary_muscle: 'back_upper',
    secondary_muscles: ['lats', 'biceps', 'back_lower'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Hinge to ~45°, bar below knees. Pull bar to lower sternum, drive elbows back. Keep back flat — do not round. Control the descent.',
  },
  {
    id: 'chest-supported-row',
    name: 'Chest Supported Row',
    primary_muscle: 'back_upper',
    secondary_muscles: ['lats', 'biceps'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Chest on incline bench removes lower-back stress. Drive elbows back and up, squeeze at the top. Good for isolating the upper back without fatigue from bracing.',
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    primary_muscle: 'back_upper',
    secondary_muscles: ['lats', 'biceps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Sit upright, not rocked back. Pull handle to lower abs, elbows tight to sides. Stretch forward at the top to maintain lat tension. Do not use momentum.',
  },
  {
    id: 'single-arm-db-row',
    name: 'Single Arm DB Row',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Brace on bench, pull dumbbell to hip. Think "elbow to ceiling". Allow full stretch at the bottom. Unilateral work corrects left-right imbalances.',
  },

  // ═══════════════════════════════════════
  // SHOULDERS
  // ═══════════════════════════════════════
  {
    id: 'barbell-overhead-press',
    name: 'Barbell Overhead Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Grip just outside shoulders. Press bar overhead, tucking it slightly back at the top. Lock out fully. Brace core hard — do not hyperextend the lower back.',
  },
  {
    id: 'seated-db-shoulder-press',
    name: 'Seated DB Shoulder Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Start with dumbbells at ear height. Press overhead and together at the top. Seat back support allows heavier loads. Keep wrists stacked over elbows.',
  },
  {
    id: 'machine-shoulder-press',
    name: 'Machine Shoulder Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps'],
    equipment: 'machine',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Adjust seat height so handles start at shoulder level. Press to near-lockout. Good for building volume safely. Focus on the deltoid contraction at the top.',
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Start with palms facing you, rotate outward as you press. Hits all three deltoid heads. Slower and heavier is better — do not rush the rotation.',
  },
  {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    primary_muscle: 'shoulders',
    secondary_muscles: [],
    equipment: 'dumbbell',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Slight bend in elbow, raise arms to shoulder height. Lead with the elbow, not the hand. Slow eccentric (3–4 sec down). Avoid shrugging or using momentum.',
  },
  {
    id: 'cable-lateral-raises',
    name: 'Cable Lateral Raises',
    primary_muscle: 'shoulders',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Cable runs across the body from the opposite side. Provides constant tension throughout the range of motion. Cross-body variation maximises stretch at the bottom.',
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    primary_muscle: 'back_upper',
    secondary_muscles: ['shoulders'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Hinge forward to 90° or lie on incline bench. Drive elbows back and out, keeping a slight elbow bend. Squeeze rear delts and upper back at the top.',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primary_muscle: 'back_upper',
    secondary_muscles: ['shoulders'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Cable at head height. Pull handles to ear level, driving elbows high and back. Externally rotate hands at the finish. Excellent for shoulder health and rear delt development.',
  },

  // ═══════════════════════════════════════
  // LEGS — QUADS / GLUTES
  // ═══════════════════════════════════════
  {
    id: 'back-squat',
    name: 'Back Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings', 'back_lower'],
    equipment: 'barbell',
    pattern: 'squat',
    difficulty: 'intermediate',
    description: 'Bar on upper traps. Break at the hips and knees simultaneously. Squat to parallel or below. Drive knees out, chest up, and push the floor away to stand.',
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'core'],
    equipment: 'barbell',
    pattern: 'squat',
    difficulty: 'advanced',
    description: 'Bar rests on the front deltoids, elbows high. Very upright torso. Demands good wrist and ankle mobility. Greater quad and core emphasis than back squat.',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'machine',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Feet shoulder-width, mid-platform. Lower until knees reach ~90°. Do not lock out fully at the top — keep tension on the quads. Foot position affects muscle emphasis.',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'intermediate',
    description: 'Rear foot elevated on bench. Lower back knee toward the floor, keeping front shin vertical. Demanding on hip flexors and balance. Corrects leg strength asymmetries.',
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes'],
    equipment: 'machine',
    pattern: 'squat',
    difficulty: 'intermediate',
    description: 'Feet low and close for max quad emphasis. Control the descent, drive hard out of the hole. Allows heavier loading than most free-weight squat variations.',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    primary_muscle: 'quads',
    secondary_muscles: [],
    equipment: 'machine',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Adjust the roller to sit just above the ankle. Extend fully, hold briefly at the top, and control the descent. Use for quad isolation or as a pre/post exhaustion tool.',
  },
  {
    id: 'walking-lunges',
    name: 'Walking Lunges',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Step forward, lower the rear knee toward the floor, then bring the back foot forward into the next step. Keep torso upright. Dumbbells optional — start bodyweight to learn the pattern.',
  },
  {
    id: 'reverse-lunges',
    name: 'Reverse Lunges',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Step back and lower the rear knee to the floor. Front shin should stay vertical. Easier on the knees than forward lunges. Alternate legs or complete all reps one side.',
  },
  {
    id: 'step-ups',
    name: 'Step-Ups',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Step onto a box or bench, drive through the heel of the working leg. Keep torso upright. Use a height where your knee is at ~90° at the bottom.',
  },

  // ═══════════════════════════════════════
  // POSTERIOR CHAIN
  // ═══════════════════════════════════════
  {
    id: 'deadlift',
    name: 'Deadlift',
    primary_muscle: 'hamstrings',
    secondary_muscles: ['glutes', 'back_lower', 'traps', 'quads'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    description: 'Bar over mid-foot. Hip-hinge to grip, wedge hips in. Push the floor down, not the bar back. Lock out hips and knees simultaneously. Keep bar in contact with legs.',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primary_muscle: 'hamstrings',
    secondary_muscles: ['glutes', 'back_lower'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    description: 'Soft knee bend, bar close to legs. Hinge at the hip until you feel a hamstring stretch (bar below knees). Drive hips forward to return. The stretch is the stimulus.',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    primary_muscle: 'glutes',
    secondary_muscles: ['hamstrings', 'quads'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'beginner',
    description: 'Upper back on bench, bar over hip crease. Drive through heels, squeeze glutes hard at the top. Hold briefly at full extension. Do not hyperextend the lower back.',
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    primary_muscle: 'glutes',
    secondary_muscles: ['hamstrings'],
    equipment: 'bodyweight',
    pattern: 'hinge',
    difficulty: 'beginner',
    description: 'Feet flat on the floor, drive hips up through the heels. Squeeze glutes at the top. Add a barbell or dumbbell across the hips to progress. Good precursor to hip thrust.',
  },
  {
    id: 'hamstring-curl',
    name: 'Hamstring Curl',
    primary_muscle: 'hamstrings',
    secondary_muscles: [],
    equipment: 'machine',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Curl the weight toward your glutes, hold briefly, and lower under control. Keep hips pressed down. Can be done lying, seated, or standing — each varies the stretch.',
  },

  // ═══════════════════════════════════════
  // ARMS — TRICEPS
  // ═══════════════════════════════════════
  {
    id: 'rope-pushdown',
    name: 'Rope Pushdown',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Elbows pinned to sides. Push the rope down and slightly apart at the bottom to maximise the contraction. Do not let elbows drift forward during the movement.',
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Face away from cable. Hands behind head, elbows pointing forward. Extend to lockout. The overhead position places the long head of the tricep in a stretched position.',
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close Grip Bench Press',
    primary_muscle: 'triceps',
    secondary_muscles: ['chest', 'shoulders'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Grip inside shoulder-width. Keep elbows tucked close to the body. Lower to lower chest, press to lockout. Heavier loading potential than cable exercises.',
  },
  {
    id: 'skull-crushers',
    name: 'Skull Crushers',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Lie flat, lower bar toward forehead by bending only the elbows. Upper arms stay vertical. Excellent long-head stimulus. Can also be done with an EZ bar or dumbbells.',
  },

  // ═══════════════════════════════════════
  // ARMS — BICEPS
  // ═══════════════════════════════════════
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Shoulder-width grip, elbows stay at sides. Curl to the top, squeeze, and lower under full control. Do not rock the torso — momentum reduces the stimulus.',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Supinate the wrist as you curl (pinky rotates up). Curl one arm at a time or alternate. Full range — arm fully extends at the bottom for a complete stretch.',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Neutral grip (thumbs up) throughout. Targets the brachialis and brachioradialis more than a supinated curl. Builds arm thickness and forearm strength.',
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Cable provides constant tension, especially at the bottom of the range where a dumbbell unloads. Keep elbows at sides and squeeze hard at the top.',
  },

  // ═══════════════════════════════════════
  // CORE
  // ═══════════════════════════════════════
  {
    id: 'hanging-leg-raises',
    name: 'Hanging Leg Raises',
    primary_muscle: 'core',
    secondary_muscles: ['hip_flexors'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'intermediate',
    description: 'Hang from a bar. Raise legs to 90° (or higher) using hip flexion and posterior pelvic tilt. Avoid swinging. Slow and controlled — lower back down deliberately.',
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    primary_muscle: 'core',
    secondary_muscles: ['back_lower'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'intermediate',
    description: 'From knees, roll out maintaining a rigid body. Pull back with the abs, not the arms. The further you extend, the harder it gets. Start with partial reps.',
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    primary_muscle: 'core',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'core',
    difficulty: 'beginner',
    description: 'Kneel facing the cable. Hold rope behind head, crunch down toward the floor. The key is flexing the spine — do not pull with the arms or hip flexors.',
  },
  {
    id: 'plank',
    name: 'Plank',
    primary_muscle: 'core',
    secondary_muscles: ['back_lower'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'beginner',
    description: 'Forearms on the floor, body in a straight line from head to heels. Squeeze glutes, brace abs hard, breathe. Quality over duration — stop when form breaks.',
  },

  // ═══════════════════════════════════════
  // ADDITIONAL
  // ═══════════════════════════════════════
  {
    id: 'farmers-carry',
    name: "Farmer's Carry",
    primary_muscle: 'traps',
    secondary_muscles: ['core', 'forearms', 'shoulders'],
    equipment: 'dumbbell',
    pattern: 'carry',
    difficulty: 'beginner',
    description: 'Hold heavy dumbbells or kettlebells at your sides. Walk with purpose — tall posture, tight core, controlled breathing. Builds grip, traps, and total-body stability.',
  },
  {
    id: 'shrugs',
    name: 'Shrugs',
    primary_muscle: 'traps',
    secondary_muscles: [],
    equipment: 'barbell',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Elevate the shoulders straight up toward the ears, hold briefly, then lower under control. Do not roll the shoulders — straight up and down. Go heavy with full range.',
  },
];

// Lookup map for O(1) access
export const EXERCISES_MAP = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

export const MUSCLE_LABELS = {
  chest:       'Chest',
  chest_upper: 'Upper Chest',
  chest_lower: 'Lower Chest',
  back_upper:  'Upper Back',
  back_lower:  'Lower Back',
  lats:        'Lats',
  shoulders:   'Shoulders',
  traps:       'Traps',
  biceps:      'Biceps',
  triceps:     'Triceps',
  forearms:    'Forearms',
  quads:       'Quads',
  hamstrings:  'Hamstrings',
  glutes:      'Glutes',
  calves:      'Calves',
  core:        'Core',
  hip_flexors: 'Hip Flexors',
};

export const EQUIPMENT_LABELS = {
  barbell:    'Barbell',
  dumbbell:   'Dumbbell',
  machine:    'Machine',
  bodyweight: 'Bodyweight',
  cable:      'Cable',
  kettlebell: 'Kettlebell',
};

export const PATTERN_LABELS = {
  push:      'Push',
  pull:      'Pull',
  squat:     'Squat',
  hinge:     'Hinge',
  core:      'Core',
  isolation: 'Isolation',
  carry:     'Carry',
};

/** Returns substitution candidates ranked by similarity */
export function getSubstitutions(exerciseId) {
  const original = EXERCISES_MAP[exerciseId];
  if (!original) return [];

  return EXERCISES
    .filter(e => e.id !== exerciseId && e.primary_muscle === original.primary_muscle)
    .map(e => ({ ...e, score: _subScore(original, e) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function _subScore(original, candidate) {
  let score = 0;
  if (candidate.pattern === original.pattern) score += 4;
  if (candidate.equipment === original.equipment) score += 3;
  // Bonus for secondary muscle overlap
  const overlap = candidate.secondary_muscles.filter(m =>
    original.secondary_muscles.includes(m)
  ).length;
  score += overlap;
  return score;
}

/** Progressive overload check */
export function checkOverload(setLogs, repRange) {
  const completed = setLogs.filter(s => s.completed);
  if (completed.length === 0) return null;
  const [, max] = repRange;
  if (completed.every(s => s.reps >= max)) {
    const topWeight = Math.max(...completed.map(s => s.weight));
    return { topWeight };
  }
  return null;
}

/** Suggest next session weight (+2.5kg upper / +5kg lower) */
export function suggestWeight(currentWeight, primaryMuscle) {
  const lower = ['quads', 'hamstrings', 'glutes', 'calves', 'back_lower'];
  return currentWeight + (lower.includes(primaryMuscle) ? 5 : 2.5);
}

/**
 * Determine the recommended weight for the next session.
 *
 * @param {Array}  lastSets      - Completed sets from the last session
 * @param {Array}  repRange      - [repMin, repMax]
 * @param {string} primaryMuscle
 * @returns {number|null}  Next weight, or null if no prior data
 */
export function getNextWeight(lastSets, repRange, primaryMuscle) {
  const completed = lastSets.filter(s => s.completed);
  if (completed.length === 0) return null;

  const [, repMax] = repRange;
  const maxWeight = Math.max(...completed.map(s => s.weight));

  // All sets hit top of rep range → increase weight
  if (completed.every(s => s.reps >= repMax)) {
    return suggestWeight(maxWeight, primaryMuscle);
  }

  // Within range or struggling → maintain
  return maxWeight;
}

export const MUSCLE_GROUPS = [
  'chest', 'chest_upper', 'chest_lower',
  'lats', 'back_upper', 'back_lower',
  'shoulders', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'core', 'hip_flexors',
];
