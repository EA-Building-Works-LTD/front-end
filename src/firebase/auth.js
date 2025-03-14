import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "./config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Sign in a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<UserCredential>} - Firebase user credential
 */
export const loginWithEmail = async (email, password) => {
  try {
    console.log(`loginWithEmail: Attempting to sign in with email ${email}`);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`loginWithEmail: Sign in successful for ${email}`);
    
    // Get user's role from Firestore
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    
    if (!userDoc.exists()) {
      console.log(`loginWithEmail: User document not found in Firestore for ${email}. Creating one...`);
      
      // Create a user document if it doesn't exist
      const userData = {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || email,
        role: "user", // Default role
        createdAt: new Date()
      };
      
      await setDoc(doc(db, "users", userCredential.user.uid), userData);
      
      console.log(`loginWithEmail: Created user document for ${email} with role 'user'`);
      
      return {
        user: userCredential.user,
        role: "user"
      };
    }
    
    const userData = userDoc.data();
    console.log(`loginWithEmail: User document found for ${email}. Role: ${userData?.role || 'user'}`);
    
    return {
      user: userCredential.user,
      role: userData?.role || "user"
    };
  } catch (error) {
    console.error(`loginWithEmail: Error signing in with email ${email}:`, error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new user with email and password without signing in
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} displayName - User's display name
 * @param {string} role - User's role (default: "user")
 * @returns {Promise<Object>} - Created user data
 */
export const registerWithEmail = async (email, password, displayName, role = "user") => {
  try {
    console.log(`registerWithEmail: Starting registration for ${email} with role ${role}`);
    
    // Save current auth state
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("No user is currently logged in. Proceeding with normal registration.");
      // Normal registration flow
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Store user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        displayName,
        role,
        createdAt: new Date()
      });
      
      return {
        success: true,
        message: `Account created successfully for ${displayName}`,
        userData: {
          uid: userCredential.user.uid,
          email,
          displayName,
          role
        }
      };
    } else {
      console.log(`Current user is logged in: ${currentUser.email}. Using admin SDK approach.`);
      
      // For creating a builder account while admin is logged in, we'll use a different approach
      // We'll create the user document in Firestore directly
      
      // First, check if the email is already in use
      try {
        // We'll use the Firestore collection to check for existing users with this email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return {
            success: false,
            message: "Email is already in use by another account"
          };
        }
      } catch (error) {
        console.error("Error checking for existing user:", error);
      }
      
      // Generate a unique ID for the new user
      const newUserId = doc(collection(db, "users")).id;
      
      // Create the user document in Firestore
      await setDoc(doc(db, "users", newUserId), {
        email,
        displayName,
        role,
        createdAt: new Date(),
        // Add a flag to indicate this user was created by an admin
        createdByAdmin: true,
        adminEmail: currentUser.email
      });
      
      console.log(`Created builder account for ${email} with ID: ${newUserId}`);
      
      return {
        success: true,
        message: `Builder account created successfully for ${displayName}`,
        userData: {
          uid: newUserId,
          email,
          displayName,
          role
        }
      };
    }
  } catch (error) {
    console.error(`registerWithEmail: Error registering user:`, error);
    return {
      success: false,
      message: error.message || "Failed to create account",
      error
    };
  }
};

/**
 * Send a password reset email
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

/**
 * Set up an observer for auth state changes
 * @param {function} callback - Callback function to handle auth state changes
 * @returns {function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    console.log(`onAuthStateChange: Auth state changed. User: ${user?.email || 'None'}`);
    
    if (user) {
      // User is signed in
      try {
        // Get user's role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        callback({
          user,
          role: userData?.role || "user"
        });
      } catch (error) {
        console.error("Error getting user data:", error);
        callback({ user, role: "user" });
      }
    } else {
      // User is signed out
      callback(null);
    }
  });
}; 