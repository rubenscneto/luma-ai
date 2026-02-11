-- Luma AI — Database Schema v2 (New Tables)
-- Run this in Supabase SQL Editor AFTER the existing schema

-- ==================== TRAINING MODULE ====================

-- Table: Training Plan Weekly (AI-generated weekly plan)
CREATE TABLE IF NOT EXISTS training_plan_weekly (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '[]',
  goal TEXT,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Workout Sessions (individual training sessions)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES training_plan_weekly(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  day_of_week TEXT,
  focus TEXT,
  duration_min INTEGER,
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Table: Workout Sets (per-exercise set logs)
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  rest_sec INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: Body Metrics (weight, etc.)
CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight_kg REAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==================== PANTRY & CONSUMPTION ====================

-- Table: Pantry Items
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'un',
  qty_current REAL DEFAULT 0,
  qty_min REAL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Consumption Logs
CREATE TABLE IF NOT EXISTS consumption_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  item_name TEXT NOT NULL,
  qty_used REAL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==================== PERSONALIZATION ====================

-- Table: User Preferences (likes, dislikes, anti-preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('like', 'dislike', 'never')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: AI Suggestion Log (for anti-repetition)
CREATE TABLE IF NOT EXISTS ai_suggestion_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  output_hash TEXT,
  output_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: Recurring Block Rules (detected patterns)
CREATE TABLE IF NOT EXISTS recurring_block_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  start_time TIME NOT NULL,
  duration_min INTEGER NOT NULL,
  priority TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: Planned Meals (persist meal calendar)
CREATE TABLE IF NOT EXISTS planned_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name TEXT NOT NULL,
  description TEXT,
  prep_time_min INTEGER,
  ingredients JSONB DEFAULT '[]',
  instructions JSONB DEFAULT '[]',
  nutrition JSONB DEFAULT '{}',
  why_fits_user TEXT,
  alternatives JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==================== ENABLE RLS ====================

ALTER TABLE training_plan_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_block_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_meals ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- Training Plan Weekly
CREATE POLICY "Users can view own training plans" ON training_plan_weekly FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own training plans" ON training_plan_weekly FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own training plans" ON training_plan_weekly FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own training plans" ON training_plan_weekly FOR DELETE USING (auth.uid() = user_id);

-- Workout Sessions
CREATE POLICY "Users can view own workout sessions" ON workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout sessions" ON workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout sessions" ON workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout sessions" ON workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Workout Sets
CREATE POLICY "Users can view own workout sets" ON workout_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout sets" ON workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout sets" ON workout_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout sets" ON workout_sets FOR DELETE USING (auth.uid() = user_id);

-- Body Metrics
CREATE POLICY "Users can view own body metrics" ON body_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own body metrics" ON body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own body metrics" ON body_metrics FOR UPDATE USING (auth.uid() = user_id);

-- Pantry Items
CREATE POLICY "Users can view own pantry" ON pantry_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pantry items" ON pantry_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pantry items" ON pantry_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pantry items" ON pantry_items FOR DELETE USING (auth.uid() = user_id);

-- Consumption Logs
CREATE POLICY "Users can view own consumption" ON consumption_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own consumption" ON consumption_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON user_preferences FOR DELETE USING (auth.uid() = user_id);

-- AI Suggestion Log
CREATE POLICY "Users can view own ai logs" ON ai_suggestion_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ai logs" ON ai_suggestion_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recurring Block Rules
CREATE POLICY "Users can view own recurring rules" ON recurring_block_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recurring rules" ON recurring_block_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring rules" ON recurring_block_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring rules" ON recurring_block_rules FOR DELETE USING (auth.uid() = user_id);

-- Planned Meals
CREATE POLICY "Users can view own planned meals" ON planned_meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own planned meals" ON planned_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own planned meals" ON planned_meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own planned meals" ON planned_meals FOR DELETE USING (auth.uid() = user_id);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_log_user_feature ON ai_suggestion_log(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_planned_meals_user_date ON planned_meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
