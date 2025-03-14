// Script to check and update user roles in Firestore
import { db, auth } from '../firebase/config';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Function to check a user's role
export const checkUserRole = async (email) => {
  try {
    // Query users collection by email
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No user found with email: ${email}`);
      return null;
    }
    
    // Get the first matching user
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`User found: ${userData.email}`);
    console.log(`Current role: ${userData.role || 'No role set'}`);
    
    return {
      uid: userDoc.id,
      ...userData
    };
  } catch (error) {
    console.error('Error checking user role:', error);
    throw error;
  }
};

// Function to update a user's role
export const updateUserRole = async (uid, role) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log(`No user found with UID: ${uid}`);
      return false;
    }
    
    const userData = userDoc.data();
    
    // Update the role
    await setDoc(userRef, {
      ...userData,
      role
    }, { merge: true });
    
    console.log(`Updated role for ${userData.email} to ${role}`);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Function to ensure a user exists in Firestore after authentication
export const ensureUserInFirestore = async (email, password, displayName, role) => {
  try {
    // First, sign in to get the user's UID
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // User doesn't exist in Firestore, create them
      await setDoc(userRef, {
        email,
        displayName: displayName || user.displayName || email,
        role,
        createdAt: new Date()
      });
      
      console.log(`Created user in Firestore: ${email} with role ${role}`);
    } else {
      // User exists, update their role if needed
      const userData = userDoc.data();
      if (userData.role !== role) {
        await setDoc(userRef, {
          ...userData,
          role
        }, { merge: true });
        
        console.log(`Updated role for ${email} from ${userData.role} to ${role}`);
      } else {
        console.log(`User ${email} already has role ${role}`);
      }
    }
    
    return user.uid;
  } catch (error) {
    console.error('Error ensuring user in Firestore:', error);
    throw error;
  }
};

// Example usage:
// checkUserRole('gcconstruction@live.co.uk').then(console.log);
// updateUserRole('user-uid-here', 'builder').then(console.log);
// ensureUserInFirestore('gcconstruction@live.co.uk', 'Zain2025!*', 'Zain', 'builder').then(console.log); 