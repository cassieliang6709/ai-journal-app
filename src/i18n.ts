import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'appName': 'AI Journal',
      'auth.signIn': 'Sign In',
      'auth.signUp': 'Sign Up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.continueWithGoogle': 'Continue with Google',
      'auth.alreadyHaveAccount': 'Already have an account? Sign in',
      'auth.dontHaveAccount': "Don't have an account? Sign up",
      'common.loading': 'Loading...',
      'nav.calendar': 'Calendar',
      'nav.journal': 'Journal',
      'nav.tasks': 'Tasks',
      'common.tasks': 'Tasks',
      'common.calendar': 'Calendar',
      'common.journal': 'Journal',
      'common.settings': 'Settings',
      'common.signOut': 'Sign Out',
      'preferences.title': 'User Preferences',
      'preferences.sleepTime': 'Sleep Time',
      'preferences.breakDuration': 'Break Duration',
      'preferences.save': 'Save Changes',
      'tasks.title': 'Task Management',
      'tasks.add': 'Add Task',
      'tasks.placeholder': 'What needs to be done?',
      'tasks.priority': 'Priority',
      'tasks.dueDate': 'Due Date',
      'tasks.estimatedTime': 'Estimated Time',
      'tasks.delete': 'Delete',
      'tasks.edit': 'Edit',
      'tasks.save': 'Save',
      'tasks.cancel': 'Cancel',
      'tasks.minutes': 'minutes',
      'tasks.high': 'High',
      'tasks.medium': 'Medium',
      'tasks.low': 'Low'
    }
  },
  zh: {
    translation: {
      'appName': 'AI 日记',
      'auth.signIn': '登录',
      'auth.signUp': '注册',
      'auth.email': '邮箱',
      'auth.password': '密码',
      'auth.continueWithGoogle': '使用 Google 账号登录',
      'auth.alreadyHaveAccount': '已有账号？点击登录',
      'auth.dontHaveAccount': '没有账号？点击注册',
      'common.loading': '加载中...',
      'nav.calendar': '日历',
      'nav.journal': '日记',
      'nav.tasks': '任务管理',
      'common.tasks': '任务管理',
      'common.calendar': '日程安排',
      'common.journal': '日记本',
      'common.settings': '个人偏好',
      'common.signOut': '退出登录',
      'preferences.title': '个人偏好设置',
      'preferences.sleepTime': '睡眠时间',
      'preferences.breakDuration': '休息时长',
      'preferences.save': '保存设置',
      'tasks.title': '任务管理',
      'tasks.add': '添加任务',
      'tasks.placeholder': '需要完成什么？',
      'tasks.priority': '优先级',
      'tasks.dueDate': '截止日期',
      'tasks.estimatedTime': '预计用时',
      'tasks.delete': '删除',
      'tasks.edit': '编辑',
      'tasks.save': '保存',
      'tasks.cancel': '取消',
      'tasks.minutes': '分钟',
      'tasks.high': '高',
      'tasks.medium': '中',
      'tasks.low': '低'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 