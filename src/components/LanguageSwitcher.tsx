import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../services/i18nService';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt' ? 'en' : 'pt';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
      title={i18n.language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
    >
      <Globe className="w-4 h-4" />
      <span>{i18n.language === 'pt' ? 'PT' : 'EN'}</span>
    </button>
  );
};
