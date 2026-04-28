import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence, signOut, signInWithCredential } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocFromServer } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { collection, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocFromServer };

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar'
];

GOOGLE_SCOPES.forEach(scope => googleProvider.addScope(scope));

const ANDROID_LOGIN_SOURCE = 'android-login';
const ANDROID_CALLBACK_SCHEME = 'br.com.jefson.tarefaflow';
const ANDROID_PACKAGE_NAME = 'br.com.jefson.tarefaflow';
const WEB_LOGIN_ORIGIN = 'https://tarefaflow2.vercel.app';
const BRIDGE_ATTEMPT_KEY = 'tarefaflow_android_login_bridge_started';
const NATIVE_LOGIN_IN_PROGRESS_KEY = 'tarefaflow_native_login_in_progress';
const TOKEN_EVENT = 'google-access-token-updated';

export const isNativeApp = () => Capacitor.isNativePlatform();

export const isBlockedInAppBrowser = () => {
  if (isNativeApp()) return false;
  const ua = navigator.userAgent || '';
  return ['FBAN', 'FBAV', 'Instagram', 'Line/', 'TikTok', 'Twitter', 'Snapchat', 'Pinterest', 'LinkedInApp']
    .some(browser => ua.includes(browser));
};

export const isAndroidLoginBridge = () => {
  try {
    return new URLSearchParams(window.location.search).get('source') === ANDROID_LOGIN_SOURCE;
  } catch {
    return false;
  }
};

export const isNativeLoginInProgress = () => {
  try {
    return localStorage.getItem(NATIVE_LOGIN_IN_PROGRESS_KEY) === '1';
  } catch {
    return false;
  }
};

const buildExternalLoginUrl = () => `${WEB_LOGIN_ORIGIN}/?source=${ANDROID_LOGIN_SOURCE}`;

const buildAndroidCallbackUrl = (idToken?: string | null, accessToken?: string | null) => {
  const params = new URLSearchParams();
  if (idToken) params.set('id_token', idToken);
  if (accessToken) params.set('access_token', accessToken);
  params.set('source', ANDROID_LOGIN_SOURCE);
  return `intent://auth?${params.toString()}#Intent;scheme=${ANDROID_CALLBACK_SCHEME};package=${ANDROID_PACKAGE_NAME};end`;
};

const parseCallbackTokens = (url: string) => {
  const queryPart = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(queryPart || hashPart || '');
  return {
    idToken: params.get('id_token'),
    accessToken: params.get('access_token'),
    source: params.get('source')
  };
};

export const handleNativeAuthCallbackUrl = async (url: string) => {
  if (!url.startsWith(`${ANDROID_CALLBACK_SCHEME}://`)) return null;

  const { idToken, accessToken, source } = parseCallbackTokens(url);
  if (source !== ANDROID_LOGIN_SOURCE || !idToken) return null;

  localStorage.setItem(NATIVE_LOGIN_IN_PROGRESS_KEY, '1');

  const credential = GoogleAuthProvider.credential(idToken, accessToken || undefined);
  const authResult = await signInWithCredential(auth, credential);

  if (accessToken) {
    localStorage.setItem('google_access_token', accessToken);
  }

  localStorage.removeItem(NATIVE_LOGIN_IN_PROGRESS_KEY);

  try {
    await Browser.close();
  } catch {
    // Ignore: browser may already be closed.
  }

  window.dispatchEvent(new CustomEvent(TOKEN_EVENT, { detail: { user: authResult.user, accessToken } }));
  return { user: authResult.user, accessToken };
};

const processNativeLaunchUrl = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      const result = await handleNativeAuthCallbackUrl(launch.url);
      if (result) window.location.replace('/');
    }
  } catch (error) {
    console.error('Native launch URL auth processing failed:', error);
  }
};

if (Capacitor.isNativePlatform()) {
  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      const result = await handleNativeAuthCallbackUrl(url);
      if (result) window.location.replace('/');
    } catch (error) {
      localStorage.removeItem(NATIVE_LOGIN_IN_PROGRESS_KEY);
      console.error('Native auth callback failed:', error);
    }
  });
  processNativeLaunchUrl();
}

export const signIn = async () => {
  try {
    if (isNativeApp()) {
      localStorage.setItem(NATIVE_LOGIN_IN_PROGRESS_KEY, '1');
      await Browser.open({ url: buildExternalLoginUrl(), presentationStyle: 'fullscreen' });
      return { user: null, accessToken: null };
    }

    if (isAndroidLoginBridge()) {
      sessionStorage.setItem(BRIDGE_ATTEMPT_KEY, '1');
      await signInWithRedirect(auth, googleProvider);
      return { user: null, accessToken: null };
    }

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (accessToken) localStorage.setItem('google_access_token', accessToken);
    return { user: result.user, accessToken };
  } catch (error: any) {
    localStorage.removeItem(NATIVE_LOGIN_IN_PROGRESS_KEY);
    console.error('Google auth failed:', error);
    if (!isNativeApp() && !isAndroidLoginBridge() && (error.code === 'auth/popup-blocked' || error.message?.includes('popup'))) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, accessToken: null };
    }
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem(NATIVE_LOGIN_IN_PROGRESS_KEY);
  localStorage.removeItem('google_access_token');
  return signOut(auth);
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      const idToken = credential?.idToken || await result.user.getIdToken();

      if (accessToken) localStorage.setItem('google_access_token', accessToken);

      if (isAndroidLoginBridge()) {
        sessionStorage.removeItem(BRIDGE_ATTEMPT_KEY);
        window.location.href = buildAndroidCallbackUrl(idToken, accessToken);
      }

      return { user: result.user, accessToken };
    }

    if (isAndroidLoginBridge() && auth.currentUser) {
      const cachedAccessToken = localStorage.getItem('google_access_token');
      const idToken = await auth.currentUser.getIdToken(true);
      if (cachedAccessToken) {
        sessionStorage.removeItem(BRIDGE_ATTEMPT_KEY);
        window.location.href = buildAndroidCallbackUrl(idToken, cachedAccessToken);
        return { user: auth.currentUser, accessToken: cachedAccessToken };
      }
    }
  } catch (error: any) {
    if (error.code === 'auth/missing-initial-state' || error.message?.includes('missing initial state')) {
      return null;
    }
    throw error;
  }
  return null;
};

const startAndroidLoginBridgeIfNeeded = () => {
  if (typeof window === 'undefined') return;
  if (Capacitor.isNativePlatform()) return;
  if (!isAndroidLoginBridge()) return;
  if (sessionStorage.getItem(BRIDGE_ATTEMPT_KEY)) return;

  sessionStorage.setItem(BRIDGE_ATTEMPT_KEY, '1');
  setTimeout(() => {
    signInWithRedirect(auth, googleProvider).catch(error => {
      sessionStorage.removeItem(BRIDGE_ATTEMPT_KEY);
      console.error('Android login bridge redirect failed:', error);
    });
  }, 300);
};

startAndroidLoginBridgeIfNeeded();
