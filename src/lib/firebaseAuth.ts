import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

// Reuse existing initialized app if present
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Gmail scopes
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

// We can cache the token in memory and localStorage
let cachedAccessToken: string | null = localStorage.getItem('google_access_token');
let cachedGoogleUser: any | null = localStorage.getItem('google_user_info') ? JSON.parse(localStorage.getItem('google_user_info')!) : null;
let isSigningIn = false;

// Set up listener to clear cache when user signs out or state changes
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    cachedGoogleUser = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user_info');
  } else {
    cachedGoogleUser = user;
    localStorage.setItem('google_user_info', JSON.stringify(user));
  }
});

export const checkRedirectResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        cachedGoogleUser = result.user;
        localStorage.setItem('google_access_token', cachedAccessToken);
        localStorage.setItem('google_user_info', JSON.stringify(result.user));
        return { user: result.user, accessToken: cachedAccessToken };
      }
    }
  } catch (error) {
    console.error('Processing redirect authentication result failed:', error);
  }
  return null;
};

export const googleSignIn = async (useRedirectFallback = true): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Gmail access token from Firebase Auth credential');
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    localStorage.setItem('google_access_token', cachedAccessToken);
    localStorage.setItem('google_user_info', JSON.stringify(result.user));
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In with popup failed:', error);
    if (useRedirectFallback && (
      error.code === 'auth/popup-closed-by-user' || 
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cancelled-popup-request'
    )) {
      console.log('Popup blocked or closed. Redirecting user for fallback authentication...');
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): any | null => {
  return cachedGoogleUser || auth.currentUser;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('google_access_token', token);
  } else {
    localStorage.removeItem('google_access_token');
  }
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedGoogleUser = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user_info');
};
