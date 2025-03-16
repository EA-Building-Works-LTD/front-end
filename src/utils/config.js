/**
 * Centralized configuration for the application
 * This allows us to access environment variables in a consistent way
 * and provide fallbacks for development
 */

// API configuration
const API_URL = process.env.REACT_APP_API_URL || '/api';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

// Authentication configuration
const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const SESSION_TIMEOUT = parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '1800000', 10); // 30 minutes
const SESSION_WARNING_TIME = parseInt(process.env.REACT_APP_SESSION_WARNING_TIME || '60000', 10); // 1 minute

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Feature flags
const FEATURES = {
  useFirebase: process.env.REACT_APP_USE_FIREBASE === 'true',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enableNotifications: process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true',
  debugMode: process.env.NODE_ENV === 'development',
};

// Export configuration
const config = {
  api: {
    baseUrl: API_URL,
    timeout: API_TIMEOUT,
  },
  auth: {
    tokenKey: AUTH_TOKEN_KEY,
    userKey: AUTH_USER_KEY,
    sessionTimeout: SESSION_TIMEOUT,
    sessionWarningTime: SESSION_WARNING_TIME,
  },
  firebase: FIREBASE_CONFIG,
  features: FEATURES,
  environment: process.env.NODE_ENV,
};

export default config; 