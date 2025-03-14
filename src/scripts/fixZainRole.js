// Script to fix Zain's user role
import { ensureUserInFirestore } from './fixUserRole';

// Run the script
const fixZainRole = async () => {
  try {
    console.log('Fixing Zain\'s user role...');
    
    // Ensure Zain exists in Firestore with the correct role
    const uid = await ensureUserInFirestore(
      'gcconstruction@live.co.uk',
      'Zain2025!*',
      'Zain',
      'builder'
    );
    
    console.log(`Successfully fixed Zain's user role. UID: ${uid}`);
    console.log('Please try logging in again.');
  } catch (error) {
    console.error('Error fixing Zain\'s user role:', error);
  }
};

// Execute the function
fixZainRole(); 