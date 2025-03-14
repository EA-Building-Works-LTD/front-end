import { 
  collection, 
  addDoc, 
  query,
  where,
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./config";
import { addLead } from "./leads";

const USERS_COLLECTION = "users";

/**
 * Processes a Google Form submission and stores it in Firebase
 * This function would be called by a server-side webhook or Cloud Function
 * that's triggered when a new form submission is added to the Google Sheet
 * 
 * @param {Object} formData - The form submission data
 * @returns {Promise<string>} - ID of the new lead in Firebase
 */
export const processGoogleFormSubmission = async (formData) => {
  try {
    // Extract builder name from the form data
    const builderName = formData.builder || "N/A";
    
    // Find the builder's UID in Firebase
    let builderId = null;
    let matchedBuilderName = null;
    
    if (builderName && builderName !== "N/A") {
      const usersCollection = collection(db, USERS_COLLECTION);
      
      // First try to find by exact displayName match
      let builderQuery = query(
        usersCollection,
        where("displayName", "==", builderName)
      );
      
      let builderSnapshot = await getDocs(builderQuery);
      
      // If not found by displayName, try email
      if (builderSnapshot.empty) {
        builderQuery = query(
          usersCollection,
          where("email", "==", builderName)
        );
        
        builderSnapshot = await getDocs(builderQuery);
      }
      
      // If still not found, get all users with role="builder" and do a case-insensitive comparison
      if (builderSnapshot.empty) {
        console.log(`Builder "${builderName}" not found by exact match, trying case-insensitive comparison`);
        
        builderQuery = query(
          usersCollection,
          where("role", "==", "builder")
        );
        
        builderSnapshot = await getDocs(builderQuery);
        
        // Convert builder name to lowercase for case-insensitive comparison
        const lowerBuilderName = builderName.toLowerCase().trim();
        
        // Check each builder for a case-insensitive match
        let foundBuilder = false;
        builderSnapshot.forEach((doc) => {
          const userData = doc.data();
          const displayName = (userData.displayName || "").toLowerCase().trim();
          const email = (userData.email || "").toLowerCase().trim();
          
          // Check for exact match (case-insensitive)
          if (displayName === lowerBuilderName || email === lowerBuilderName) {
            builderId = doc.id;
            matchedBuilderName = userData.displayName || userData.email;
            foundBuilder = true;
            console.log(`Found builder by case-insensitive match: ${matchedBuilderName} (${builderId})`);
          }
        });
        
        // If still not found, try partial matches
        if (!foundBuilder) {
          console.log(`Builder "${builderName}" not found by case-insensitive match, trying partial matches`);
          
          builderSnapshot.forEach((doc) => {
            const userData = doc.data();
            const displayName = (userData.displayName || "").toLowerCase().trim();
            const email = (userData.email || "").toLowerCase().trim();
            
            // Check if builder name contains or is contained in the display name or email
            if (displayName.includes(lowerBuilderName) || 
                lowerBuilderName.includes(displayName) ||
                email.includes(lowerBuilderName) || 
                lowerBuilderName.includes(email)) {
              builderId = doc.id;
              matchedBuilderName = userData.displayName || userData.email;
              foundBuilder = true;
              console.log(`Found builder by partial match: ${matchedBuilderName} (${builderId})`);
            }
          });
        }
      } else {
        // Builder found by exact match
        builderId = builderSnapshot.docs[0].id;
        matchedBuilderName = builderSnapshot.docs[0].data().displayName || builderName;
        console.log(`Found builder ${matchedBuilderName} with ID ${builderId}`);
      }
    }
    
    // If builder not found, assign to a default admin user
    if (!builderId) {
      console.log("Builder not found, assigning to admin");
      
      // Get the first admin user as a fallback
      const usersCollection = collection(db, USERS_COLLECTION);
      const adminQuery = query(
        usersCollection,
        where("role", "==", "admin")
      );
      
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        builderId = adminSnapshot.docs[0].id;
        matchedBuilderName = adminSnapshot.docs[0].data().displayName || "Admin";
        console.log(`Assigned to admin with ID ${builderId}`);
      } else {
        // If no admin found, use a placeholder ID
        builderId = "unassigned";
        matchedBuilderName = "Unassigned";
        console.warn("No admin found, using 'unassigned' as builderId");
      }
    }
    
    // Prepare lead data from Google Form submission
    const leadData = {
      // Basic contact info
      fullName: formData.fullName || "",
      phoneNumber: formData.phoneNumber || "",
      email: formData.email || "",
      
      // Location info
      address: formData.address || "",
      city: formData.city || "",
      
      // Project details
      workRequired: formData.workRequired || "",
      details: formData.details || "",
      budget: formData.budget || "",
      startDate: formData.startDate || "",
      
      // Communication preferences
      contactPreference: formData.contactPreference || "",
      
      // Assignment and status
      builderId: builderId,
      builder: matchedBuilderName || builderName, // Use the matched builder name if found
      originalBuilderName: builderName, // Store the original builder name from the form
      stage: "New Lead",
      stageManuallySet: false,
      
      // Timestamps
      timestamp: formData.timestamp ? new Date(formData.timestamp) : serverTimestamp(),
      
      // Additional metadata
      activities: [
        {
          type: "stage_change",
          title: "New Lead Created",
          description: `Lead has been submitted for ${matchedBuilderName || builderName || "unknown"}`,
          timestamp: serverTimestamp()
        }
      ],
      googleFormSubmission: true, // Flag to indicate this came from a Google Form
      googleSheetRowId: formData.rowId || null
    };
    
    // Add the lead to Firestore
    const leadId = await addLead(leadData);
    
    console.log(`Added lead ${leadId} for builder ${matchedBuilderName || builderName}`);
    return leadId;
  } catch (error) {
    console.error("Error processing Google Form submission:", error);
    throw error;
  }
};

/**
 * Syncs new Google Form submissions
 * This would be called periodically to check for new submissions
 * 
 * @param {Array} googleSheetLeads - Array of leads from Google Sheets
 * @returns {Promise<{success: boolean, message: string, syncedCount: number}>}
 */
export const syncGoogleFormSubmissions = async (googleSheetLeads) => {
  try {
    console.log(`Syncing ${googleSheetLeads?.length || 0} leads from Google Sheets`);
    
    if (!googleSheetLeads || googleSheetLeads.length === 0) {
      return {
        success: false,
        message: "No leads provided from Google Sheets",
        syncedCount: 0
      };
    }
    
    // Get existing leads from Firebase to avoid duplicates
    const leadsCollection = collection(db, "leads");
    const existingLeadsSnapshot = await getDocs(leadsCollection);
    
    // Create a map of existing leads by email and phone for quick lookup
    const existingLeadsByEmail = new Map();
    const existingLeadsByPhone = new Map();
    
    existingLeadsSnapshot.forEach(doc => {
      const leadData = doc.data();
      
      // Index by email if available
      if (leadData.email) {
        existingLeadsByEmail.set(leadData.email.toLowerCase(), {
          id: doc.id,
          ...leadData
        });
      }
      
      // Index by phone if available
      if (leadData.phoneNumber) {
        // Normalize phone number by removing non-digits
        const normalizedPhone = leadData.phoneNumber.replace(/\D/g, '');
        if (normalizedPhone) {
          existingLeadsByPhone.set(normalizedPhone, {
            id: doc.id,
            ...leadData
          });
        }
      }
    });
    
    console.log(`Found ${existingLeadsSnapshot.size} existing leads in Firebase`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each lead from Google Sheets
    const syncPromises = googleSheetLeads.map(async (lead) => {
      try {
        // Skip leads without essential information
        if (!lead.fullName || (!lead.phoneNumber && !lead.email)) {
          console.log(`Skipping lead with insufficient data: ${lead.fullName || 'Unknown'}`);
          skippedCount++;
          return;
        }
        
        // Check if lead already exists by email
        let existingLead = null;
        if (lead.email) {
          existingLead = existingLeadsByEmail.get(lead.email.toLowerCase());
          if (existingLead) {
            console.log(`Lead with email ${lead.email} already exists in Firebase (ID: ${existingLead.id})`);
            skippedCount++;
            return;
          }
        }
        
        // Check if lead already exists by phone
        if (!existingLead && lead.phoneNumber) {
          // Normalize phone number by removing non-digits
          const normalizedPhone = lead.phoneNumber.replace(/\D/g, '');
          if (normalizedPhone) {
            existingLead = existingLeadsByPhone.get(normalizedPhone);
            if (existingLead) {
              console.log(`Lead with phone ${lead.phoneNumber} already exists in Firebase (ID: ${existingLead.id})`);
              skippedCount++;
              return;
            }
          }
        }
        
        // If lead doesn't exist, process it
        const formData = {
          ...lead,
          timestamp: lead.timestamp || new Date().toISOString(),
          rowId: lead._id || null
        };
        
        // Process the Google Form submission
        await processGoogleFormSubmission(formData);
        syncedCount++;
        
        console.log(`Successfully synced lead: ${lead.fullName}`);
      } catch (error) {
        console.error(`Error syncing lead ${lead.fullName || 'Unknown'}:`, error);
        errorCount++;
      }
    });
    
    // Wait for all sync operations to complete
    await Promise.all(syncPromises);
    
    const message = `Sync completed: ${syncedCount} leads synced, ${skippedCount} skipped, ${errorCount} errors`;
    console.log(message);
    
    return {
      success: syncedCount > 0,
      message,
      syncedCount,
      skippedCount,
      errorCount
    };
  } catch (error) {
    console.error("Error syncing Google Form submissions:", error);
    return {
      success: false,
      message: `Error syncing: ${error.message}`,
      syncedCount: 0
    };
  }
}; 