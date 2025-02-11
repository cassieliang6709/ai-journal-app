import { supabase } from './supabase';

export async function initDatabase() {
  try {
    // 检查 journals 表是否存在
    const { error: journalsError } = await supabase
      .from('journals')
      .select('count')
      .limit(1);

    if (journalsError && journalsError.code === '42P01') {
      console.log('Creating journals table...');
      await supabase.rpc('init_journals_table');
    }

    // 检查 journal_insights 表是否存在
    const { error: insightsError } = await supabase
      .from('journal_insights')
      .select('count')
      .limit(1);

    if (insightsError && insightsError.code === '42P01') {
      console.log('Creating journal_insights table...');
      await supabase.rpc('init_journal_insights_table');
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
} 