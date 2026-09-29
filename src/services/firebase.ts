import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'consent',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('l2m_google_sheet_token', token);
    } else {
      localStorage.removeItem('l2m_google_sheet_token');
    }
  } catch {
    // ignore
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    return onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (user) {
          const token = cachedAccessToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('l2m_google_sheet_token') : null) || '';
          if (onAuthSuccess) onAuthSuccess(user, token);
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      },
      (error) => {
        // Handle API key or network errors quietly
        console.warn('Firebase Auth state notice:', error?.message || error);
        if (onAuthFailure) onAuthFailure();
      }
    );
  } catch (err) {
    console.warn('Firebase initAuth initialization warning:', err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่พบสิทธิ์ Access Token สำหรับ Google Sheets กรุณากดยืนยันอนุญาตการเข้าถึง Google Sheets อีกครั้ง');
    }

    cachedAccessToken = credential.accessToken;
    setAccessToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code || '';

    if (errorCode === 'auth/api-key-not-valid' || errorMsg.includes('api-key-not-valid')) {
      throw new Error(
        'คีย์ Firebase API ของโปรเจกต์ (boss-timer-pro31) ยังไม่ได้เปิดใช้งาน Identity Toolkit หรือมีข้อจำกัดสิทธิ์ใน Google Cloud Console\n👉 กรุณาใช้ระบบล็อกอินด้วย ID สำหรับสมาชิกและเพื่อนๆ หรือตรวจสอบการตั้งค่า Firebase'
      );
    }

    if (errorCode === 'auth/popup-closed-by-user') {
      throw new Error('หน้าต่างเข้าสู่ระบบ Google ถูกปิดก่อนดำเนินการเสร็จสิ้น');
    }

    if (errorCode === 'auth/cancelled-popup-request') {
      throw new Error('คำขอเข้าสู่ระบบถูกยกเลิก');
    }

    throw new Error(errorMsg || 'การเข้าสู่ระบบ Google ขัดข้อง กรุณาลองใหม่อีกครั้ง');
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    return localStorage.getItem('l2m_google_sheet_token');
  } catch {
    return null;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  setAccessToken(null);
};
