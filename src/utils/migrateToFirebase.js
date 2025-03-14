import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

/**
 * Migrates data from localStorage to Firebase Firestore
 * @returns {Promise<boolean>} - True if migration was successful, false otherwise
 */
export const migrateLocalStorageToFirebase = async () => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error('User must be logged in to migrate data');
      return false;
    }

    const userId = auth.currentUser.uid;
    
    // Check if migration has already been done
    const migrationFlagKey = `firebase_migration_${userId}`;
    const alreadyMigrated = localStorage.getItem(migrationFlagKey) === 'true';
    
    if (alreadyMigrated) {
      console.log('Data has already been migrated to Firebase');
      return true;
    }
    
    // Check if there's data in Firestore already
    const docRef = doc(db, 'leadData', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && Object.keys(docSnap.data().myLeadData || {}).length > 0) {
      console.log('Data already exists in Firebase, skipping migration');
      localStorage.setItem(migrationFlagKey, 'true');
      return true;
    }
    
    // Get data from localStorage
    const myLeadData = JSON.parse(localStorage.getItem('myLeadData') || '{}');
    
    // Skip migration if there's no data
    if (Object.keys(myLeadData).length === 0) {
      console.log('No data to migrate');
      localStorage.setItem(migrationFlagKey, 'true');
      return true;
    }
    
    // Write to Firebase
    await setDoc(doc(db, 'leadData', userId), {
      myLeadData
    });
    
    // Set migration flag in localStorage
    localStorage.setItem(migrationFlagKey, 'true');
    
    console.log('Data migration successful');
    return true;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
};

/**
 * Checks if the user needs to migrate data from localStorage to Firebase
 * @returns {boolean} - True if migration is needed, false otherwise
 */
export const needsMigration = () => {
  // Check if user is authenticated
  if (!auth.currentUser) {
    return false;
  }
  
  const userId = auth.currentUser.uid;
  
  // Check if migration has already been done
  const migrationFlagKey = `firebase_migration_${userId}`;
  const alreadyMigrated = localStorage.getItem(migrationFlagKey) === 'true';
  
  if (alreadyMigrated) {
    return false;
  }
  
  // Check if there's data in localStorage
  const myLeadData = localStorage.getItem('myLeadData');
  
  return myLeadData && myLeadData !== '{}';
}; 