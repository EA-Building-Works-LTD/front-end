import { 
  collection, 
  addDoc, 
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "./config";
import { addLead } from "./leads";
import axios from "axios";

const USERS_COLLECTION = "users";

/**
 * Fetches leads data from Google Sheets
 * 
 * @returns {Promise<Array>} - Array of lead objects from Google Sheets
 */
export const fetchGoogleSheetLeads = async () => {
  try {
    console.log("Fetching leads from Google Sheets API");
    
    // Get the authentication token from local storage
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    
    // Make the API request to fetch leads from Google Sheets
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/google-leads`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error("Invalid response data format:", response.data);
      return [];
    }
    
    console.log(`Fetched ${response.data.length} leads from Google Sheets API`);
    return response.data;
  } catch (error) {
    console.error("Error fetching leads from Google Sheets:", error);
    throw error;
  }
};

/**
 * Fetches and syncs new leads from Google Sheets
 * This function will always sync the 20 most recent leads, plus any additional new leads
 * 
 * @param {boolean} forceSync - Whether to force sync all leads regardless of last sync timestamp
 * @returns {Promise<Object>} - Object with sync results
 */
export const fetchAndSyncNewLeads = async (forceSync = false) => {
  try {
    console.log("Fetching and syncing new leads from Google Sheets");
    
    // Get the last sync timestamp from local storage
    const lastSyncTimestamp = localStorage.getItem("lastGoogleFormSyncTimestamp");
    const lastProcessedRowId = localStorage.getItem("lastProcessedGoogleFormRowId");
    
    console.log(`Last sync timestamp: ${lastSyncTimestamp ? new Date(parseInt(lastSyncTimestamp)).toLocaleString() : 'Never'}`);
    console.log(`Last processed row ID: ${lastProcessedRowId || 'None'}`);
    
    // Fetch all leads from Google Sheets
    const googleSheetLeads = await fetchGoogleSheetLeads();
    
    if (!googleSheetLeads || googleSheetLeads.length === 0) {
      console.log("No leads found in Google Sheets");
      return {
        success: false,
        message: "No leads found in Google Sheets",
        syncedCount: 0
      };
    }
    
    console.log(`Fetched ${googleSheetLeads.length} leads from Google Sheets`);
    
    // Sort leads by timestamp (newest first) or by row ID if timestamp is not available
    const sortedLeads = [...googleSheetLeads].sort((a, b) => {
      // Try to use timestamp first
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      
      if (timestampA && timestampB) {
        return timestampB - timestampA; // Descending order (newest first)
      }
      
      // Fall back to row ID
      const rowIdA = parseInt(a.rowId || a._id || 0);
      const rowIdB = parseInt(b.rowId || b._id || 0);
      
      return rowIdB - rowIdA; // Descending order (newest first)
    });
    
    // Take the 20 most recent leads
    const latestLeads = sortedLeads.slice(0, 20);
    
    // Log a sample of the latest leads for debugging
    console.log(`Top 3 latest leads sample:`, latestLeads.slice(0, 3).map(lead => ({
      fullName: lead.fullName,
      timestamp: lead.timestamp,
      rowId: lead.rowId || lead._id,
      email: lead.email
    })));
    
    // Find any additional new leads that are not in the latest 20
    // but are newer than the last sync timestamp or row ID
    let additionalNewLeads = [];
    
    if (!forceSync && lastSyncTimestamp && lastProcessedRowId) {
      const lastSyncTime = parseInt(lastSyncTimestamp);
      const lastRowId = parseInt(lastProcessedRowId);
      
      additionalNewLeads = sortedLeads.slice(20).filter(lead => {
        // Check if lead is newer than last sync timestamp
        const leadTimestamp = lead.timestamp ? new Date(lead.timestamp).getTime() : 0;
        if (leadTimestamp && leadTimestamp > lastSyncTime) {
          return true;
        }
        
        // Check if lead has a higher row ID than last processed
        const rowId = parseInt(lead.rowId || lead._id || 0);
        if (rowId && rowId > lastRowId) {
          return true;
        }
        
        return false;
      });
      
      console.log(`Found ${additionalNewLeads.length} additional new leads since last sync`);
    }
    
    // Combine latest leads with any additional new leads
    const leadsToSync = [...latestLeads, ...additionalNewLeads];
    
    console.log(`Syncing ${leadsToSync.length} leads (${latestLeads.length} latest + ${additionalNewLeads.length} additional new)`);
    
    // Sync the leads to Firebase
    const syncResults = await syncGoogleFormSubmissions(leadsToSync);
    
    // Only update the last sync timestamp and row ID if we had some successful syncs
    if (syncResults.synced > 0) {
      // Update the last sync timestamp and row ID in local storage
      const now = Date.now();
      localStorage.setItem("lastGoogleFormSyncTimestamp", now.toString());
      
      // Find the highest row ID in the synced leads
      const highestRowId = Math.max(...leadsToSync.map(lead => parseInt(lead.rowId || lead._id || 0)));
      if (highestRowId > 0) {
        localStorage.setItem("lastProcessedGoogleFormRowId", highestRowId.toString());
      }
      
      console.log(`Sync completed at ${new Date(now).toLocaleString()}, highest row ID: ${highestRowId}`);
    } else {
      console.log("No leads were successfully synced. Not updating last sync timestamp or row ID.");
      
      if (syncResults.errors > 0) {
        console.log(`${syncResults.errors} errors occurred during sync.`);
        if (syncResults.errorMessages && syncResults.errorMessages.length > 0) {
          console.log("First few error messages:");
          syncResults.errorMessages.slice(0, 3).forEach((msg, i) => {
            console.log(`${i + 1}. ${msg}`);
          });
        }
      }
    }
    
    return {
      ...syncResults,
      success: syncResults.synced > 0,
      message: syncResults.synced > 0 
        ? `Synced ${syncResults.synced} leads (${syncResults.new} new, ${syncResults.updated} updated)` 
        : `Failed to sync leads. ${syncResults.errors} errors occurred.`,
      newLeads: leadsToSync
    };
  } catch (error) {
    console.error("Error fetching and syncing new leads:", error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      syncedCount: 0,
      newLeads: []
    };
  }
};

/**
 * Processes a Google Form submission and stores it in Firebase
 * This function would be called by a server-side webhook or Cloud Function
 * that's triggered when a new form submission is added to the Google Sheet
 * 
 * @param {Object} formData - The form submission data
 * @param {string} [existingLeadId] - Optional ID of an existing lead to update
 * @returns {Promise<string>} - ID of the new or updated lead in Firebase
 */
export const processGoogleFormSubmission = async (formData, existingLeadId = null) => {
  try {
    const isUpdate = !!existingLeadId;
    console.log(`${isUpdate ? 'Updating' : 'Processing'} form submission for ${formData.fullName || 'Unknown'}, Row ID: ${formData.rowId || 'N/A'}`);
    
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
    
    // Ensure we have a valid timestamp
    let timestamp;
    if (formData.timestamp) {
      // Try to parse the timestamp
      const parsedDate = new Date(formData.timestamp);
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate;
      } else if (typeof formData.timestamp === 'number') {
        // If it's a number, assume it's seconds since epoch
        timestamp = new Date(formData.timestamp * 1000);
      } else {
        // If we can't parse it, use current time
        timestamp = new Date();
      }
    } else {
      timestamp = new Date();
    }
    
    // Ensure we have a valid row ID
    const googleSheetRowId = formData.rowId || formData._id || null;
    console.log(`Using Google Sheet Row ID: ${googleSheetRowId}`);
    
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
      
      // Only set stage and stageManuallySet for new leads
      ...(isUpdate ? {} : {
        stage: "New Lead",
        stageManuallySet: false,
      }),
      
      // Timestamps
      timestamp: timestamp,
      updatedAt: serverTimestamp(), // Add a server timestamp for when it was updated
      
      // Additional metadata
      googleFormSubmission: true, // Flag to indicate this came from a Google Form
      googleSheetRowId: googleSheetRowId
    };
    
    // For new leads
    if (!isUpdate) {
      leadData.createdAt = serverTimestamp(); // Keep serverTimestamp for top-level fields
      leadData.activities = [
        {
          type: "stage_change",
          title: "New Lead Created",
          description: `Lead has been submitted for ${matchedBuilderName || builderName || "unknown"}`,
          timestamp: new Date() // Use regular Date object instead of serverTimestamp()
        }
      ];
    } else {
      // For updates, add an update activity
      const leadsCollection = collection(db, "leads");
      const leadDoc = await getDocs(query(leadsCollection, where("__name__", "==", existingLeadId)));
      
      if (!leadDoc.empty) {
        const existingData = leadDoc.docs[0].data();
        const existingActivities = existingData.activities || [];
        
        // Add a new activity for the update
        leadData.activities = [
          ...existingActivities,
          {
            type: "update",
            title: "Lead Updated",
            description: `Lead information updated from Google Sheet`,
            timestamp: new Date() // Use regular Date object instead of serverTimestamp()
          }
        ];
      }
    }
    
    let leadId;
    
    // Add or update the lead in Firestore
    if (isUpdate) {
      // Update existing lead
      const leadRef = doc(db, "leads", existingLeadId);
      await updateDoc(leadRef, leadData);
      leadId = existingLeadId;
      console.log(`Updated lead ${leadId} for builder ${matchedBuilderName || builderName}, Row ID: ${googleSheetRowId}`);
    } else {
      // Add new lead
      leadId = await addLead(leadData);
      console.log(`Added lead ${leadId} for builder ${matchedBuilderName || builderName}, Row ID: ${googleSheetRowId}`);
    }
    
    return leadId;
  } catch (error) {
    console.error("Error processing Google Form submission:", error);
    throw error;
  }
};

/**
 * Syncs Google Form submissions from a Google Sheet to Firebase
 * 
 * @param {Array} leads - Array of lead objects from Google Sheets
 * @returns {Promise<Object>} - Object with counts of synced, skipped, and errored leads
 */
export const syncGoogleFormSubmissions = async (leads) => {
  try {
    console.log(`Starting sync of ${leads.length} leads from Google Sheets to Firebase`);
    
    // Initialize counters
    let syncedCount = 0;
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let errorMessages = [];
    
    // Get all existing leads from Firebase for comparison
    const leadsCollection = collection(db, "leads");
    const existingLeadsSnapshot = await getDocs(leadsCollection);
    
    // Create maps for faster lookups
    const leadsByRowId = new Map();
    const leadsByEmail = new Map();
    const leadsByPhone = new Map();
    
    existingLeadsSnapshot.forEach((doc) => {
      const leadData = doc.data();
      
      // Map by Google Sheet Row ID
      if (leadData.googleSheetRowId) {
        leadsByRowId.set(leadData.googleSheetRowId.toString(), {
          id: doc.id,
          ...leadData
        });
      }
      
      // Map by email (if available and valid)
      if (leadData.email && leadData.email !== "N/A" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
        leadsByEmail.set(leadData.email.toLowerCase(), {
          id: doc.id,
          ...leadData
        });
      }
      
      // Map by phone number (if available and valid)
      if (leadData.phoneNumber && leadData.phoneNumber !== "N/A") {
        // Normalize phone number by removing non-numeric characters
        const normalizedPhone = leadData.phoneNumber.replace(/\D/g, '');
        if (normalizedPhone.length > 0) {
          leadsByPhone.set(normalizedPhone, {
            id: doc.id,
            ...leadData
          });
        }
      }
    });
    
    console.log(`Found ${leadsByRowId.size} leads by Row ID, ${leadsByEmail.size} by email, and ${leadsByPhone.size} by phone`);
    
    // Process each lead from Google Sheets
    for (const lead of leads) {
      try {
        // Skip leads without required fields
        if (!lead || (!lead.fullName && !lead.phoneNumber && !lead.email)) {
          console.log(`Skipping lead with missing required fields: ${JSON.stringify(lead)}`);
          skippedCount++;
          continue;
        }
        
        // Prepare row ID for comparison
        const rowId = (lead.rowId || lead._id || "").toString();
        
        // Prepare email for comparison
        const email = lead.email && typeof lead.email === 'string' ? lead.email.toLowerCase() : null;
        
        // Prepare phone number for comparison
        const phoneNumber = lead.phoneNumber ? lead.phoneNumber.replace(/\D/g, '') : null;
        
        // Check if lead already exists in Firebase by Row ID
        let existingLead = null;
        
        if (rowId) {
          existingLead = leadsByRowId.get(rowId);
          if (existingLead) {
            console.log(`Found existing lead by Row ID ${rowId}: ${existingLead.fullName} (${existingLead.id})`);
            
            // Update the existing lead with the latest data from Google Sheets
            try {
              // Process the Google Form submission (will update the existing lead)
              await processGoogleFormSubmission(lead, existingLead.id);
              updatedCount++;
              syncedCount++;
              console.log(`Updated lead ${existingLead.id} by Row ID match`);
              continue;
            } catch (error) {
              console.error(`Error updating lead ${existingLead.id} by Row ID:`, error);
              errorCount++;
              errorMessages.push(`Error updating lead ${existingLead.fullName} (${existingLead.id}): ${error.message}`);
              continue;
            }
          }
        }
        
        // If not found by Row ID, check by email
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          existingLead = leadsByEmail.get(email);
          if (existingLead) {
            console.log(`Found existing lead by email ${email}: ${existingLead.fullName} (${existingLead.id})`);
            
            // Update the existing lead with the latest data from Google Sheets
            try {
              // Process the Google Form submission (will update the existing lead)
              await processGoogleFormSubmission(lead, existingLead.id);
              updatedCount++;
              syncedCount++;
              console.log(`Updated lead ${existingLead.id} by email match`);
              continue;
            } catch (error) {
              console.error(`Error updating lead ${existingLead.id} by email:`, error);
              errorCount++;
              errorMessages.push(`Error updating lead ${existingLead.fullName} (${existingLead.id}): ${error.message}`);
              continue;
            }
          }
        }
        
        // If not found by email, check by phone number
        if (phoneNumber && phoneNumber.length > 0) {
          existingLead = leadsByPhone.get(phoneNumber);
          if (existingLead) {
            console.log(`Found existing lead by phone ${phoneNumber}: ${existingLead.fullName} (${existingLead.id})`);
            
            // Update the existing lead with the latest data from Google Sheets
            try {
              // Process the Google Form submission (will update the existing lead)
              await processGoogleFormSubmission(lead, existingLead.id);
              updatedCount++;
              syncedCount++;
              console.log(`Updated lead ${existingLead.id} by phone match`);
              continue;
            } catch (error) {
              console.error(`Error updating lead ${existingLead.id} by phone:`, error);
              errorCount++;
              errorMessages.push(`Error updating lead ${existingLead.fullName} (${existingLead.id}): ${error.message}`);
              continue;
            }
          }
        }
        
        // If lead doesn't exist, process it as a new lead
        console.log(`Syncing new lead: ${lead.fullName}, Row ID: ${lead.rowId}, Email: ${lead.email || 'N/A'}, Phone: ${lead.phoneNumber || 'N/A'}`);
        
        try {
          // Process the Google Form submission
          const leadId = await processGoogleFormSubmission(lead);
          newCount++;
          syncedCount++;
          console.log(`Added new lead ${leadId}`);
        } catch (error) {
          console.error(`Error processing new lead ${lead.fullName || 'Unknown'}:`, error);
          errorCount++;
          errorMessages.push(`Error adding new lead ${lead.fullName || 'Unknown'}: ${error.message}`);
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.fullName || 'Unknown'}:`, error);
        errorCount++;
        errorMessages.push(`Error processing lead ${lead.fullName || 'Unknown'}: ${error.message}`);
      }
    }
    
    // Log a summary of the sync operation
    console.log(`Sync completed: ${syncedCount} leads synced (${newCount} new, ${updatedCount} updated), ${skippedCount} skipped, ${errorCount} errors`);
    
    if (errorMessages.length > 0) {
      console.log("Error details:");
      errorMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg}`);
      });
    }
    
    return {
      synced: syncedCount,
      new: newCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorMessages: errorMessages
    };
  } catch (error) {
    console.error("Error syncing Google Form submissions:", error);
    throw error;
  }
}; 