import { useTranslation } from 'react-i18next';
import { UserProfile } from '../types';
import { Shield } from 'lucide-react';

export function SettingsView({ userProfile, setActiveTab }: { userProfile: UserProfile | null, setActiveTab: (tab: string) => void }) {
  const { t, i18n } = useTranslation();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>
      <div className="space-y-6">
        {userProfile && (
          <div className="p-4 bg-white rounded-xl shadow-sm flex items-center gap-4">
            {userProfile.photoURL && <img src={userProfile.photoURL} alt="Profile" className="w-16 h-16 rounded-full" />}
            <div>
              <h3 className="font-bold text-lg">{userProfile.displayName || 'Estudante'}</h3>
              <p className="text-sm text-slate-500">{userProfile.email}</p>
            </div>
          </div>
        )}
        
        {userProfile?.role_user === 'admin' && (
          <button 
            onClick={() => setActiveTab('admin')}
            className="w-full p-4 bg-indigo-600 text-white rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold"
          >
            <Shield className="w-5 h-5" />
            {t('admin.panel')}
          </button>
        )}

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
