/*
  # 添加任务开始和结束时间

  1. 新增列
    - `start_time`: 任务开始时间
    - `end_time`: 任务结束时间
    - `ai_suggestions`: 存储AI对任务的建议
    - `subtasks`: 存储子任务列表
*/

DO $$ 
BEGIN
  -- 添加开始时间
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN start_time timestamptz;
  END IF;

  -- 添加结束时间
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN end_time timestamptz;
  END IF;

  -- 添加AI建议
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'ai_suggestions'
  ) THEN
    ALTER TABLE todos ADD COLUMN ai_suggestions jsonb;
  END IF;

  -- 添加子任务
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'subtasks'
  ) THEN
    ALTER TABLE todos ADD COLUMN subtasks jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;