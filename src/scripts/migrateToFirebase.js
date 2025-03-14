import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import axios from "axios";

const LEADS_COLLECTION = "leads";

/**
 * Migrates lead data from Google Sheets to Firebase Firestore
 * @returns {Promise<{success: boolean, message: string, migratedCount: number}>}
 */
export const migrateGoogleSheetsToFirebase = async () => {
  try {
    // Check if user is authenticated and is an admin
    if (!auth.currentUser) {
      return {
        success: false,
        message: "You must be logged in to migrate data",
        migratedCount: 0
      };
    }

    // Get token for API request
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        success: false,
        message: "Authentication token not found",
        migratedCount: 0
      };
    }

    // Fetch leads from Google Sheets API
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/google-leads`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const googleLeads = response.data;
    if (!googleLeads || googleLeads.length === 0) {
      return {
        success: false,
        message: "No leads found in Google Sheets",
        migratedCount: 0
      };
    }

    console.log(`Found ${googleLeads.length} leads in Google Sheets`);

    // Check if leads already exist in Firebase
    const leadsCollection = collection(db, LEADS_COLLECTION);
    const existingLeadsSnapshot = await getDocs(leadsCollection);
    const existingLeadsCount = existingLeadsSnapshot.size;

    if (existingLeadsCount > 0) {
      console.log(`Found ${existingLeadsCount} existing leads in Firebase`);
      
      // Optional: You could implement a strategy to handle duplicates here
      // For now, we'll just inform the user
      if (existingLeadsCount >= googleLeads.length) {
        return {
          success: true,
          message: `Migration may have already been completed. Found ${existingLeadsCount} leads in Firebase.`,
          migratedCount: 0
        };
      }
    }

    // Migrate leads to Firebase
    let migratedCount = 0;
    const migrationPromises = googleLeads.map(async (lead) => {
      try {
        // Extract builder name from the lead
        const builderName = lead.builder || "N/A";
        
        // Find the builder's UID in Firebase
        // Note: This assumes you have a collection of users with a 'username' field
        // You may need to adjust this based on your actual user data structure
        const usersCollection = collection(db, "users");
        const builderQuery = query(
          usersCollection,
          where("username", "==", builderName)
        );
        
        const builderSnapshot = await getDocs(builderQuery);
        let builderId = null;
        
        if (!builderSnapshot.empty) {
          builderId = builderSnapshot.docs[0].id;
        }
        
        // If builder not found, assign to a default or admin user
        if (!builderId) {
          builderId = auth.currentUser.uid; // Default to current user (admin)
        }
        
        // Create a new lead document in Firebase
        // Map Google Form fields to Firebase structure
        const leadData = {
          // Basic contact info
          fullName: lead.fullName || "",
          phoneNumber: lead.phoneNumber || "",
          email: lead.email || "",
          
          // Location info
          address: lead.address || "",
          city: lead.city || "",
          
          // Project details
          workRequired: lead.workRequired || "",
          details: lead.details || "",
          budget: lead.budget || "",
          startDate: lead.startDate || "",
          
          // Communication preferences
          contactPreference: lead.contactPreference || "",
          
          // Assignment and status
          builderId: builderId,
          builder: builderName,
          stage: "New Lead",
          stageManuallySet: false,
          
          // Timestamps
          timestamp: new Date(lead.timestamp) || serverTimestamp(),
          
          // Additional metadata
          activities: [
            {
              type: "stage_change",
              title: "New Lead Created",
              description: `Lead has been submitted for ${builderName || "unknown"}`,
              timestamp: serverTimestamp()
            }
          ],
          googleSheetId: lead._id, // Store the original Google Sheet ID for reference
          googleFormSubmission: true // Flag to indicate this came from a Google Form
        };
        
        // Add the lead to Firestore
        await addDoc(collection(db, LEADS_COLLECTION), leadData);
        migratedCount++;
        
        return true;
      } catch (error) {
        console.error(`Error migrating lead ${lead._id}:`, error);
        return false;
      }
    });
    
    // Wait for all migrations to complete
    await Promise.all(migrationPromises);
    
    return {
      success: true,
      message: `Successfully migrated ${migratedCount} leads from Google Forms to Firebase`,
      migratedCount
    };
  } catch (error) {
    console.error("Error during migration:", error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      migratedCount: 0
    };
  }
};

/**
 * Checks if migration is needed by comparing lead counts
 * @returns {Promise<{needed: boolean, googleSheetsCount: number, firebaseCount: number}>}
 */
export const checkMigrationNeeded = async () => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return {
        needed: false,
        googleSheetsCount: 0,
        firebaseCount: 0,
        message: "You must be logged in to check migration status"
      };
    }

    // Get token for API request
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        needed: false,
        googleSheetsCount: 0,
        firebaseCount: 0,
        message: "Authentication token not found"
      };
    }

    // Fetch leads count from Google Sheets API
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/google-leads`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const googleSheetsCount = response.data.length;

    // Check leads count in Firebase
    const leadsCollection = collection(db, LEADS_COLLECTION);
    const firebaseSnapshot = await getDocs(leadsCollection);
    const firebaseCount = firebaseSnapshot.size;

    // Determine if migration is needed
    const needed = googleSheetsCount > 0 && firebaseCount < googleSheetsCount;

    return {
      needed,
      googleSheetsCount,
      firebaseCount,
      message: needed 
        ? `Migration needed: ${googleSheetsCount} leads in Google Forms, ${firebaseCount} in Firebase` 
        : "Migration not needed"
    };
  } catch (error) {
    console.error("Error checking migration status:", error);
    return {
      needed: false,
      googleSheetsCount: 0,
      firebaseCount: 0,
      message: `Error checking migration status: ${error.message}`
    };
  }
}; 