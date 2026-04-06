import { useTranslation } from 'react-i18next';

export function SettingsView() {
  const { t, i18n } = useTranslation();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>
      <div className="space-y-6">
        <div className="p-4 bg-white rounded-xl shadow-sm">
          <h3 className="font-semibold mb-2">{t('academicProfile')}</h3>
          <select className="w-full p-2 border rounded-lg">
            <option value="school">{t('school')}</option>
            <option value="university">{t('university')}</option>
          </select>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm">
          <h3 className="font-semibold mb-2">{t('language')}</h3>
          <button onClick={() => i18n.changeLanguage('en')} className="mr-2 p-2 bg-blue-100 rounded">EN</button>
          <button onClick={() => i18n.changeLanguage('pt')} className="p-2 bg-blue-100 rounded">PT</button>
        </div>
      </div>
    </div>
  );
}
