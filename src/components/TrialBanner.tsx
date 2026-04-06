import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '../types';
import { checkTrialStatus } from '../services/subscriptionService';
import { AlertTriangle } from 'lucide-react';

interface TrialBannerProps {
  user: UserProfile;
  onSubscribeClick: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ user, onSubscribeClick }) => {
  const { t } = useTranslation();
  
  if (user.role_user === 'admin' || user.isReleased || user.subscriptionStatus === 'active') {
    return null;
  }

  const { isTrialing, daysRemaining, isExpired } = checkTrialStatus(user);

  if (isExpired) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4 rounded-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('payment.trialExpired')}
          </p>
        </div>
        <button
          onClick={onSubscribeClick}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          {t('payment.subscribeNow')}
        </button>
      </div>
    );
  }

  if (isTrialing && daysRemaining <= 5) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-4 rounded-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('payment.trialBanner', { days: daysRemaining })}
          </p>
        </div>
        <button
          onClick={onSubscribeClick}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          {t('payment.subscribeNow')}
        </button>
      </div>
    );
  }

  return null;
};
