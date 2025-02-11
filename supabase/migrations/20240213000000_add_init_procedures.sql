-- 创建初始化 journals 表的存储过程
CREATE OR REPLACE FUNCTION init_journals_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, date)
  );
END;
$$ LANGUAGE plpgsql;

-- 创建初始化 journal_insights 表的存储过程
CREATE OR REPLACE FUNCTION init_journal_insights_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS journal_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    emotional_state TEXT,
    emotion_cause TEXT,
    management_tips TEXT,
    thinking_patterns TEXT,
    cognitive_biases TEXT,
    action_suggestions TEXT[],
    mindfulness_tips TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(journal_id)
  );
END;
$$ LANGUAGE plpgsql; 