import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./config";

/**
 * Request permission for notifications and get the messaging token
 * @returns {Promise<string|null>} The messaging token or null if not available
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn("Firebase messaging is not available");
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return null;
    }
    
    // Get token
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
    });
    
    if (token) {
      console.log("Notification token:", token);
      return token;
    } else {
      console.log("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("Error getting notification token:", error);
    return null;
  }
};

/**
 * Handle foreground messages
 * @param {Function} callback - Function to call when a message is received
 * @returns {Function} Unsubscribe function
 */
export const setupForegroundMessaging = (callback) => {
  if (!messaging) {
    console.warn("Firebase messaging is not available");
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    callback(payload);
  });
}; 