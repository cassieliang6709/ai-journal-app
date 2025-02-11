import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
    >
      <Languages className="w-5 h-5" />
      <span>{i18n.language === 'zh' ? '中文' : 'English'}</span>
    </button>
  );
}

export default LanguageToggle;