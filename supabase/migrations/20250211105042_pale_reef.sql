/*
  # 添加预计用时字段

  1. 更改
    - 向 `todos` 表添加 `estimated_time` 列，用于存储任务预计完成时间（分钟）
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'estimated_time'
  ) THEN
    ALTER TABLE todos ADD COLUMN estimated_time integer;
  END IF;
END $$;