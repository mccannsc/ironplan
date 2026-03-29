// IronPlan Exercise Database

export const EXERCISES = [

  // ═══════════════════════════════════════
  // CHEST
  // ═══════════════════════════════════════
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'shoulders', 'triceps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Lie flat, grip slightly wider than shoulder-width. Lower bar to mid-chest, press to lockout. Retract shoulder blades throughout.',
  },
  {
    id: 'incline-barbell-press',
    name: 'Incline Barbell Press',
    primary_muscle: 'chest_upper',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Bench at 30–45°. Lower bar to upper chest. Emphasises the clavicular head. Keep elbows at ~75° to torso.',
  },
  {
    id: 'decline-barbell-press',
    name: 'Decline Barbell Press',
    primary_muscle: 'chest_lower',
    secondary_muscles: ['chest', 'triceps'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Bench at –15 to –30°. Targets the lower chest. Lower the bar to the lower pec line.',
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'shoulders', 'triceps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Greater range of motion than barbell. Allows independent arm movement. Press and bring dumbbells slightly together at top.',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primary_muscle: 'chest_upper',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Bench at 30–45°. Excellent upper chest builder with full stretch at bottom. Keep elbows slightly tucked.',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    primary_muscle: 'chest',
    secondary_muscles: ['chest_upper', 'chest_lower'],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Set cables at mid or high/low height. Hug a barrel motion. Maintain slight elbow bend. Full stretch at start position.',
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    primary_muscle: 'chest',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'machine',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Fixed path reduces stability demand. Good for isolation and drop sets. Adjust seat so handles align with lower chest.',
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    primary_muscle: 'chest',
    secondary_muscles: ['shoulders', 'triceps', 'core'],
    equipment: 'bodyweight',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Hands slightly wider than shoulder-width. Lower until chest nearly touches floor. Keep body rigid. Full lockout at top.',
  },
  {
    id: 'dip',
    name: 'Dip',
    primary_muscle: 'chest_lower',
    secondary_muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'bodyweight',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Lean forward to emphasise chest. Lower until elbows reach 90°. Control descent. For tricep focus, stay upright.',
  },
  {
    id: 'smith-machine-incline-press',
    name: 'Smith Machine Incline Press',
    primary_muscle: 'chest_upper',
    secondary_muscles: ['shoulders', 'triceps'],
    equipment: 'smith',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Fixed bar path offers stability for upper chest focus. Good for drop sets and going to failure safely.',
  },

  // ═══════════════════════════════════════
  // BACK
  // ═══════════════════════════════════════
  {
    id: 'barbell-deadlift',
    name: 'Barbell Deadlift',
    primary_muscle: 'back_lower',
    secondary_muscles: ['hamstrings', 'glutes', 'traps', 'lats', 'core'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'advanced',
    description: 'Hip hinge pattern. Bar over mid-foot. Grip outside legs. Brace core, push floor away. Lockout hips and knees simultaneously.',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'traps', 'biceps', 'rear_delts'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Hinge to ~45°. Pull bar to lower chest/upper abs. Lead with elbows. Retract scapula at top. Control the descent.',
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps', 'traps'],
    equipment: 'bodyweight',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Overhand grip, shoulder-width or wider. Pull until chin clears bar. Full hang at bottom. Control the descent.',
  },
  {
    id: 'chin-up',
    name: 'Chin-Up',
    primary_muscle: 'lats',
    secondary_muscles: ['biceps', 'back_upper'],
    equipment: 'bodyweight',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Underhand shoulder-width grip. Greater bicep involvement than pull-up. Pull until chin clears bar, full hang at bottom.',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps', 'traps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Slightly wider than shoulder-width grip. Pull to upper chest. Lean back slightly. Retract shoulder blades. Full stretch at top.',
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    primary_muscle: 'back_upper',
    secondary_muscles: ['lats', 'biceps', 'traps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Sit upright. Pull handle to lower chest. Retract scapula at end. Avoid excessive torso swing. Full stretch at start.',
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps', 'traps'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'One hand on bench. Pull dumbbell to hip. Elbow drives up and back. Full stretch at bottom. Neutral spine.',
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'traps', 'biceps'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Straddle the bar, hinge forward. Pull to lower chest. Excellent for mid-back thickness. Keep back neutral.',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primary_muscle: 'back_upper',
    secondary_muscles: ['shoulders', 'traps'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Cable at head height. Pull rope to face, separate hands at end position. Targets rear delts and rotator cuff. Excellent shoulder health exercise.',
  },
  {
    id: 'machine-row',
    name: 'Machine Row',
    primary_muscle: 'lats',
    secondary_muscles: ['back_upper', 'biceps'],
    equipment: 'machine',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Chest pad reduces cheating. Focus on scapular retraction. Good for isolating back without fatigue from stabilising.',
  },

  // ═══════════════════════════════════════
  // SHOULDERS
  // ═══════════════════════════════════════
  {
    id: 'barbell-ohp',
    name: 'Barbell Overhead Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps', 'core'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Press bar from front rack to lockout. Bar travels slightly back at top. Brace core. Keep rib cage down.',
  },
  {
    id: 'dumbbell-ohp',
    name: 'Dumbbell Shoulder Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Can be seated or standing. Neutral or pronated grip. Press overhead, slight inward arc. Full lockout at top.',
  },
  {
    id: 'dumbbell-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    primary_muscle: 'shoulders',
    secondary_muscles: [],
    equipment: 'dumbbell',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Raise arms to shoulder height with slight forward tilt (thumb slightly down). Pause briefly at top. Control descent. Go lighter than you think.',
  },
  {
    id: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    primary_muscle: 'shoulders',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Cable at lowest position. Cross-body or same-side pull. Provides constant tension throughout the range of motion vs dumbbells.',
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps', 'traps'],
    equipment: 'dumbbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Start palms facing you, rotate to palms forward as you press up. Rotational element increases anterior delt involvement.',
  },
  {
    id: 'machine-shoulder-press',
    name: 'Machine Shoulder Press',
    primary_muscle: 'shoulders',
    secondary_muscles: ['triceps'],
    equipment: 'machine',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Adjust seat so handles start at shoulder height. Good for loading shoulders without overhead bar coordination demands.',
  },

  // ═══════════════════════════════════════
  // ARMS – BICEPS
  // ═══════════════════════════════════════
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Supinated grip, elbows fixed at sides. Curl to shoulder height. Lower with control. EZ-bar reduces wrist stress.',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Can be alternating or simultaneous. Supinate at the top for peak contraction. Keep elbows fixed, no swinging.',
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'cable',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Constant tension throughout the movement. Cable at low setting with straight bar or EZ attachment. Elbows fixed.',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms', 'brachialis'],
    equipment: 'dumbbell',
    pattern: 'pull',
    difficulty: 'beginner',
    description: 'Neutral grip (thumbs up). Targets brachialis and brachioradialis. Great for forearm and overall arm thickness.',
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    primary_muscle: 'biceps',
    secondary_muscles: ['forearms'],
    equipment: 'barbell',
    pattern: 'pull',
    difficulty: 'intermediate',
    description: 'Arm rests on preacher pad eliminating cheating. Excellent for the long (inner) head. Do not hyperextend at bottom.',
  },

  // ═══════════════════════════════════════
  // ARMS – TRICEPS
  // ═══════════════════════════════════════
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Rope or bar attachment. Push down to full extension. Keep elbows fixed at sides. Slight forward lean is fine.',
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Lie flat, arms perpendicular to body. Lower bar to forehead/behind head. Elbows slightly flared. EZ-bar is more comfortable.',
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'push',
    difficulty: 'beginner',
    description: 'Cable above head, rope attachment. Extend arms overhead. Stretches long head. Keep upper arms beside ears.',
  },
  {
    id: 'close-grip-bench',
    name: 'Close Grip Bench Press',
    primary_muscle: 'triceps',
    secondary_muscles: ['chest', 'shoulders'],
    equipment: 'barbell',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Narrow grip (shoulder-width). Elbows tucked close to torso. Lower to lower chest. Excellent mass builder for triceps.',
  },
  {
    id: 'tricep-dip',
    name: 'Tricep Dip',
    primary_muscle: 'triceps',
    secondary_muscles: ['chest_lower', 'shoulders'],
    equipment: 'bodyweight',
    pattern: 'push',
    difficulty: 'intermediate',
    description: 'Stay upright to emphasise triceps over chest. Full lockout at top, lower to 90°. Can add weight via belt.',
  },

  // ═══════════════════════════════════════
  // LEGS
  // ═══════════════════════════════════════
  {
    id: 'barbell-squat',
    name: 'Barbell Back Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings', 'core', 'back_lower'],
    equipment: 'barbell',
    pattern: 'squat',
    difficulty: 'advanced',
    description: 'Bar on traps. Feet shoulder-width, toes out. Hip crease below parallel. Drive through whole foot. Keep torso upright.',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primary_muscle: 'hamstrings',
    secondary_muscles: ['glutes', 'back_lower', 'traps'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    description: 'Start standing with bar. Hinge at hips, slight knee bend. Lower until deep hamstring stretch. Drive hips forward to return.',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'machine',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Foot position affects muscle emphasis. Higher placement = more glutes/hamstrings. Lower = more quads. Full range of motion.',
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    primary_muscle: 'hamstrings',
    secondary_muscles: ['calves'],
    equipment: 'machine',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Prone or seated. Curl to full contraction. Pause briefly. Control the negative. Toes neutral or slightly pointed.',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    primary_muscle: 'quads',
    secondary_muscles: [],
    equipment: 'machine',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Extend to full lockout. Hold briefly. Control descent. Adjust pad to just above ankles. Good for VMO development.',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    pattern: 'squat',
    difficulty: 'intermediate',
    description: 'Rear foot elevated. Front foot far enough to keep shin vertical. Lower until rear knee nearly touches floor. Brutal and effective.',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    primary_muscle: 'glutes',
    secondary_muscles: ['hamstrings', 'quads', 'back_lower'],
    equipment: 'barbell',
    pattern: 'hinge',
    difficulty: 'intermediate',
    description: 'Upper back on bench, bar on hips. Drive hips to full extension. Squeeze glutes hard at top. Chin tucked. Feet flat.',
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    primary_muscle: 'calves',
    secondary_muscles: [],
    equipment: 'machine',
    pattern: 'isolation',
    difficulty: 'beginner',
    description: 'Full range of motion is key. Deep stretch at bottom, pause at top. Slow eccentric. Toes forward, in, or out.',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    primary_muscle: 'quads',
    secondary_muscles: ['glutes', 'core'],
    equipment: 'kettlebell',
    pattern: 'squat',
    difficulty: 'beginner',
    description: 'Hold weight at chest. Upright torso. Great for learning squat pattern. Wide stance, elbows inside knees.',
  },
  {
    id: 'dumbbell-rdl',
    name: 'Dumbbell RDL',
    primary_muscle: 'hamstrings',
    secondary_muscles: ['glutes', 'back_lower'],
    equipment: 'dumbbell',
    pattern: 'hinge',
    difficulty: 'beginner',
    description: 'Dumbbells in front of thighs. Hinge at hips with soft knees. Lower until hamstring tension is felt. Great for learning hinge pattern.',
  },

  // ═══════════════════════════════════════
  // CORE
  // ═══════════════════════════════════════
  {
    id: 'plank',
    name: 'Plank',
    primary_muscle: 'core',
    secondary_muscles: ['shoulders', 'glutes'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'beginner',
    description: 'Forearms on floor, body straight. Squeeze glutes and abs. Hips level. Progress with added plates on back or time.',
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    primary_muscle: 'core',
    secondary_muscles: ['hip_flexors'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'intermediate',
    description: 'Dead hang. Raise legs until parallel or higher. Avoid swinging. Posterior pelvic tilt at top for full ab contraction.',
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    primary_muscle: 'core',
    secondary_muscles: [],
    equipment: 'cable',
    pattern: 'core',
    difficulty: 'beginner',
    description: 'Kneel, rope overhead. Crunch down toward knees. Think about bringing rib cage to hips. Load progressively like any other muscle.',
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    primary_muscle: 'core',
    secondary_muscles: ['lats', 'shoulders'],
    equipment: 'bodyweight',
    pattern: 'core',
    difficulty: 'advanced',
    description: 'On knees, roll out maintaining rigid body. Pull back with abs, not arms. Start with partial reps if needed.',
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
  brachialis:  'Brachialis',
  hip_flexors: 'Hip Flexors',
  rear_delts:  'Rear Delts',
};

export const EQUIPMENT_LABELS = {
  barbell:    'Barbell',
  dumbbell:   'Dumbbell',
  machine:    'Machine',
  bodyweight: 'Bodyweight',
  cable:      'Cable',
  kettlebell: 'Kettlebell',
  smith:      'Smith Machine',
};

export const PATTERN_LABELS = {
  push:      'Push',
  pull:      'Pull',
  hinge:     'Hinge',
  squat:     'Squat',
  carry:     'Carry',
  core:      'Core',
  isolation: 'Isolation',
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

/** Suggest next session weight */
export function suggestWeight(currentWeight, primaryMuscle) {
  const lower = ['quads', 'hamstrings', 'glutes', 'calves', 'back_lower'];
  return currentWeight + (lower.includes(primaryMuscle) ? 5 : 2.5);
}

export const MUSCLE_GROUPS = [
  'chest', 'chest_upper', 'chest_lower',
  'lats', 'back_upper', 'back_lower',
  'shoulders', 'traps',
  'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves',
  'core',
];
