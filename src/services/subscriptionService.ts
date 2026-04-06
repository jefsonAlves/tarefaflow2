import { UserProfile } from '../types';

export const checkTrialStatus = (user: UserProfile) => {
  if (!user.trialEndsAt) return { isTrialing: false, daysRemaining: 0, isExpired: false };
  
  const trialEnd = new Date(user.trialEndsAt);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isTrialing: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired: daysRemaining <= 0
  };
};

export const isPremiumFeatureEnabled = (user: UserProfile | null) => {
  if (!user) return false;
  if (user.role_user === 'admin') return true;
  if (user.isReleased) return true;
  if (user.subscriptionStatus === 'active') return true;
  
  const trialStatus = checkTrialStatus(user);
  return trialStatus.isTrialing && !trialStatus.isExpired;
};
