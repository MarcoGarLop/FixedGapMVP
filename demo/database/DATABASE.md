# FixedGap — Database Schema Documentation

**Version:** 1.1.0  
**Platform:** Supabase (PostgreSQL 15+)  
**Date:** 2026-07-15

---

## 1. Purpose

Normative database for motor rehabilitation telemonitoring. Stores biomechanical metrics captured via MediaPipe Hand Landmarker during gamified rehabilitation sessions. Designed to:

- Build a reference bank of healthy subjects for population comparison
- Support future patient tracking with longitudinal evolution
- Feed the clinical dashboard with queryable, structured metrics
- Enable research export and algorithmic recomputation

---

## 2. Architecture Overview

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│  operators  │──1:N──│  subjects   │──1:N──│  sessions   │──1:3──│ game_results │
│  (team)     │       │  (players)  │       │ (playthru)  │       │  (metrics)   │
└─────────────┘       └─────────────┘       └─────────────┘       └──────────────┘
```

- **Operator**: Team member with login (username + password, no email)
- **Subject**: Person who plays (family, friend, future patient). No credentials.
- **Session**: One complete playthrough (3 games in sequence)
- **Game Result**: One game's full metric output (38 clinical columns + JSONB raw data)

---

## 3. Table Schemas

### 3.1 `operators`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Links to Supabase Auth user |
| username | text UNIQUE | Human-readable identifier (login) |
| display_name | text | Optional friendly name |
| created_at | timestamptz | Account creation |

### 3.2 `subjects`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| operator_id | uuid FK → operators | Who created this subject |
| display_name | text | Name or pseudonym |
| birth_year | smallint | Year of birth (privacy: no full date) |
| sex | enum | male / female / other |
| dominant_hand | enum | left / right / ambidextrous |
| subject_type | enum | healthy / patient |
| patient_data | jsonb | Future: affected_side, medications, etc. |
| notes | text | Free-form operator notes |
| is_active | boolean | Soft delete |
| created_at / updated_at | timestamptz | Timestamps |

### 3.3 `sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| subject_id | uuid FK → subjects | Who played |
| operator_id | uuid FK → operators | Who supervised |
| started_at | timestamptz | Session start |
| ended_at | timestamptz | Auto-set when 3 games complete |
| completed | boolean | Auto-set via trigger |
| games_played | smallint | 0-3, auto-updated |
| device | jsonb | userAgent, screen/camera dimensions |
| quality_frames_pct | real | % frames passing quality gate |
| avg_fps | real | Mean tracking FPS |
| notes | text | Free-form |

### 3.4 `game_results`

38 clinical metric columns organized by domain:

| Domain | Columns | Applicable Games |
|--------|---------|-----------------|
| A. Pinch & Grasp | pinch_count, pinch_distance_mean_mm, pinch_distance_max_mm, tripod_quality_mean, thumb_opposition_mean, grip_aperture_mean_mm, grip_aperture_cv | All |
| B. Hand Opening & Extension | hand_open_pct_p90, hand_open_pct_p10, hand_opening_speed_p75, fingers_extended_max, fingers_extended_mean, index_extension_p75, finger_individuation_mean | All |
| C. Range of Motion | rom_deg_p90, rom_norm_mean, max_supination_deg*, max_pronation_deg* | All (*jarra only, qualitative) |
| D. Velocity & Kinematics | palm_speed_mean, palm_speed_p75, mean_peak_velocity, peak_velocity_ratio_mean | All |
| E. Smoothness (SPARC) | session_sparc, sparc_mean, sparc_cv, sparc_worst | All |
| F. Tremor | tremor_amp_mean, tremor_freq_hz, tremor_band, intention_tremor_mean | All |
| G. Inter-rep Variability | rep_count, duration_cv, peak_velocity_cv, mean_velocity_cv, mean_duration_ms | All |
| H. Spatial Precision | bve_value, endpoint_accuracy, endpoint_max_error | Pastillero only |
| I. Reaction Time | reaction_time_mean_ms, reaction_time_median_ms, reaction_time_cv, reaction_time_count | All |
| J. Fatigue & Asymmetry | fatigue_index, asymmetry_mean, asymmetry_readings | All |
| K. Composite (exploratory) | cri_score, cri_level | All |
| L. Signal Quality | quality_frames_pct, avg_fps | All |

Plus 3 JSONB fields:

| Field | Purpose |
|-------|---------|
| repetitions | Full per-repetition array (finest granularity, for recomputation) |
| outcome | Game-specific results (placed/errors, spills, score) |
| metrics_display | Legacy mapped values for backward-compatible dashboard |

---

## 4. Security Model

- **Row Level Security (RLS)** on all tables
- Each operator sees only their own subjects, sessions, and results
- Prepared for future admin role with cross-operator access
- No email or PII stored beyond operator username and subject display_name

---

## 5. Automatic Behaviors

| Trigger | Action |
|---------|--------|
| INSERT on game_results | Updates session.games_played, session.completed, session.ended_at |
| UPDATE on subjects | Auto-sets updated_at |

---

## 6. Incremental Design (Adding New Games & Metrics)

The schema is designed to grow without destructive migrations.

### Adding a new game

```sql
-- 1. Extend the enum
ALTER TYPE game_key_type ADD VALUE 'new_game_name';

-- 2. Insert game_results as normal
-- Columns that don't apply to the new game stay NULL
-- (e.g., bve_value is NULL for non-targeting games)
```

No table restructuring. No data migration. Existing data untouched.

### Adding a new metric

```sql
-- 1. Add column
ALTER TABLE game_results ADD COLUMN new_metric_name real;

-- 2. Optionally backfill from JSONB (if raw data allows recomputation)
UPDATE game_results SET new_metric_name = (repetitions->0->>'some_field')::real
WHERE new_metric_name IS NULL;
```

Old rows have NULL for the new column. New rows populate it. Queries filter with `WHERE new_metric_name IS NOT NULL`.

### Adding patient-specific fields

```sql
-- patient_data is already JSONB — just start writing new keys:
UPDATE subjects SET patient_data = jsonb_build_object(
  'affected_side', 'left',
  'months_since_stroke', 14,
  'medications', ARRAY['baclofen']
) WHERE id = '...';
```

No migration needed. Schema evolves with the data.

### Modifying an algorithm

If a metric calculation changes (e.g., improved SPARC), the `repetitions` JSONB contains the raw per-repetition data needed to recompute aggregates:

```sql
-- Example: recalculate mean_peak_velocity from raw repetitions
UPDATE game_results SET mean_peak_velocity = (
  SELECT AVG((elem->>'peak_velocity')::real)
  FROM jsonb_array_elements(repetitions) elem
);
```

---

## 7. Migration Path (Leaving Supabase)

Supabase is standard PostgreSQL. There is no proprietary lock-in on data or structure.

### What's portable as-is

| Component | Portability |
|-----------|-------------|
| All tables, indexes, triggers | 100% standard SQL |
| JSONB columns | PostgreSQL standard |
| Materialized views | PostgreSQL standard |
| Data | pg_dump / pg_restore |

### What needs adaptation (~10 lines)

| Component | Change needed |
|-----------|---------------|
| RLS policies | Replace `auth.uid()` with your auth system's user ID function |
| Auth | Replace Supabase Auth with your own (JWT, Firebase, custom) |
| Connection string | Point client to new Postgres host |

### Migration steps

1. `pg_dump --no-owner --no-acl` from Supabase
2. `pg_restore` on target (AWS RDS, Cloud SQL, self-hosted, etc.)
3. Update RLS policies to reference new auth mechanism
4. Update client-side Supabase SDK calls to new connection
5. Test with existing data

**Estimated effort**: 2-4 hours for a developer familiar with the codebase.

---

## 8. Normative Comparison

A materialized view (`mv_normative_percentiles`) pre-computes percentiles by game, sex, and age decade for the most clinically relevant metrics. This enables instant patient-vs-healthy comparisons without real-time aggregation.

Refresh after new data:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_normative_percentiles;
```

Minimum sample threshold: 5 sessions per demographic bucket.  
Quality filter: only sessions with >70% valid frames are included.

---

## 9. Privacy Considerations

- No email addresses collected (operators use username only)
- Subjects identified by display_name (can be pseudonym)
- Only birth_year stored (not full date of birth)
- No video, images, or biometric identifiers stored
- All data access scoped by operator via RLS
- GDPR-compatible: deletion cascades from operator → subjects → sessions → game_results
