import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { auth } from "../firebase/config";
import { generateAndStoreToken } from "../firebase/auth";
import axios from "axios";

const LEADS_COLLECTION = "leads";
const USERS_COLLECTION = "users";

/**
 * Cleans up any failed documents that were created during a sync operation
 * @param {Array} failedDocIds - Array of document IDs to delete
 * @returns {Promise<number>} - Number of documents deleted
 */
export const cleanupFailedDocs = async (failedDocIds) => {
  if (!failedDocIds || failedDocIds.length === 0) {
    return 0;
  }
  
  console.log(`Cleaning up ${failedDocIds.length} failed documents...`);
  let deletedCount = 0;
  
  for (const docId of failedDocIds) {
    try {
      await deleteDoc(doc(db, LEADS_COLLECTION, docId));
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting document ${docId}:`, error);
    }
  }
  
  console.log(`Successfully deleted ${deletedCount} failed documents`);
  return deletedCount;
};

/**
 * Syncs a limited number of leads from Google Sheets to Firebase for testing,
 * with an option to force sync even if leads already exist
 * @param {number} limit - Maximum number of leads to sync (default: 10)
 * @param {boolean} forceSync - Whether to force sync leads even if they already exist
 * @returns {Promise<Object>} - Result of the sync operation
 */
export const syncTestLeadsToFirebase = async (limit = 10, forceSync = false) => {
  const failedDocIds = []; // Track document IDs of failed adds
  
  try {
    console.log(`Starting test sync of up to ${limit} Google Sheets leads to Firebase${forceSync ? ' (force sync mode)' : ''}...`);
    
    // Get token for API request
    let token = localStorage.getItem("token");
    
    // If no token is found, try to generate a new one if the user is logged in
    if (!token && auth.currentUser) {
      try {
        console.log("No token found in localStorage. Generating a new one...");
        token = await generateAndStoreToken(auth.currentUser);
      } catch (tokenError) {
        console.error("Error generating token:", tokenError);
      }
    }
    
    if (!token) {
      console.error("Authentication token not found");
      return {
        success: false,
        message: "Authentication token not found",
        syncedCount: 0
      };
    }
    
    // Fetch leads from Google Sheets API
    let response;
    try {
      response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/google-leads`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (apiError) {
      console.error("Error fetching leads from Google Sheets API:", apiError.message);
      if (apiError.response) {
        console.error("API Response:", apiError.response.status, apiError.response.data);
      }
      return {
        success: false,
        message: `Error fetching leads: ${apiError.message}`,
        syncedCount: 0
      };
    }
    
    const googleLeads = response.data;
    if (!googleLeads || googleLeads.length === 0) {
      console.error("No leads found in Google Sheets");
      return {
        success: false,
        message: "No leads found in Google Sheets",
        syncedCount: 0
      };
    }
    
    console.log(`Found ${googleLeads.length} leads in Google Sheets, will process up to ${limit}`);
    
    // Limit the number of leads to process
    const limitedLeads = googleLeads.slice(0, limit);
    
    // Log sample leads for debugging
    console.log("Sample leads from Google Sheets:");
    limitedLeads.slice(0, 3).forEach((lead, index) => {
      console.log(`Lead ${index + 1}: ${lead.fullName}, Phone: ${lead.phoneNumber}, Email: ${lead.email}`);
    });
    
    // Get all builders from Firebase for matching
    const usersCollection = collection(db, USERS_COLLECTION);
    const buildersQuery = query(usersCollection, where("role", "==", "builder"));
    const buildersSnapshot = await getDocs(buildersQuery);
    
    const builders = [];
    buildersSnapshot.forEach(doc => {
      builders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${builders.length} builders in Firebase`);
    
    // Find Zain's user ID specifically
    let zainUserId = null;
    const zainQuery = query(usersCollection, where("email", "==", "gcconstruction@live.co.uk"));
    const zainSnapshot = await getDocs(zainQuery);
    if (!zainSnapshot.empty) {
      zainUserId = zainSnapshot.docs[0].id;
      console.log("Found Zain's user ID:", zainUserId);
    }
    
    // Create a map of builder identifiers for flexible matching
    const builderIdentifiers = new Map();
    
    // For each builder, create a set of possible identifiers
    builders.forEach(builder => {
      const identifiers = new Set();
      
      // Add display name if available (highest priority)
      if (builder.displayName) {
        identifiers.add(builder.displayName.toLowerCase());
        
        // Add each word of the display name (for partial matches)
        builder.displayName.split(/\s+/).forEach(word => {
          if (word.length > 2) { // Only consider words longer than 2 chars
            identifiers.add(word.toLowerCase());
          }
        });
      }
      
      // Extract username from email as a fallback (lower priority)
      if (builder.email) {
        const username = builder.email.split('@')[0];
        
        // Add variations of username (split by common separators)
        username.split(/[._-]/).forEach(part => {
          if (part.length > 2) { // Only consider parts longer than 2 chars
            identifiers.add(part.toLowerCase());
          }
        });
      }
      
      builderIdentifiers.set(builder.id, {
        builder,
        identifiers: [...identifiers],
        displayName: builder.displayName || "",
        email: builder.email || ""
      });
    });
    
    // Get existing leads from Firebase to avoid duplicates
    const leadsCollection = collection(db, LEADS_COLLECTION);
    const existingLeadsSnapshot = await getDocs(leadsCollection);
    
    // Create a map of existing leads by email and phone for quick lookup
    const existingLeadsByEmail = new Map();
    const existingLeadsByPhone = new Map();
    
    console.log(`Found ${existingLeadsSnapshot.size} existing leads in Firebase, creating lookup maps...`);
    
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
    
    console.log(`Created lookup maps: ${existingLeadsByEmail.size} emails, ${existingLeadsByPhone.size} phone numbers`);
    
    // Log a few examples for debugging
    if (existingLeadsByEmail.size > 0) {
      console.log("Sample emails in lookup:", Array.from(existingLeadsByEmail.keys()).slice(0, 3));
    }
    if (existingLeadsByPhone.size > 0) {
      console.log("Sample phone numbers in lookup:", Array.from(existingLeadsByPhone.keys()).slice(0, 3));
    }
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let errors = []; // Track specific errors
    
    // Process each lead from Google Sheets
    for (const lead of limitedLeads) {
      try {
        // Skip leads without essential information
        if (!lead.fullName || (!lead.phoneNumber && !lead.email)) {
          console.log(`Skipping lead with insufficient data: ${lead.fullName || 'Unknown'}`);
          skippedCount++;
          continue;
        }
        
        // Add more detailed logging to understand why leads are being skipped
        console.log(`Processing lead: ${lead.fullName}, Phone: ${lead.phoneNumber}, Email: ${lead.email}`);
        
        // Check if lead already exists by email (skip if forceSync is true)
        let existingLead = null;
        if (!forceSync && lead.email) {
          existingLead = existingLeadsByEmail.get(lead.email.toLowerCase());
          if (existingLead) {
            console.log(`Lead with email ${lead.email} already exists in Firebase (ID: ${existingLead.id})`);
            skippedCount++;
            continue;
          }
        }
        
        // Check if lead already exists by phone (skip if forceSync is true)
        if (!forceSync && !existingLead && lead.phoneNumber) {
          // Normalize phone number by removing non-digits
          const normalizedPhone = lead.phoneNumber.replace(/\D/g, '');
          console.log(`Checking phone number: ${lead.phoneNumber}, Normalized: ${normalizedPhone}`);
          
          if (normalizedPhone) {
            existingLead = existingLeadsByPhone.get(normalizedPhone);
            if (existingLead) {
              console.log(`Lead with phone ${lead.phoneNumber} already exists in Firebase (ID: ${existingLead.id})`);
              skippedCount++;
              continue;
            }
          }
        }
        
        // Find the matching builder
        const builderName = lead.builder || "N/A";
        let builderId = null;
        let matchedBuilderName = null;
        
        // Special case for Zain - check if the builder name contains "Zain"
        if (zainUserId && builderName.toLowerCase().includes("zain")) {
          builderId = zainUserId;
          matchedBuilderName = "Zain";
          console.log(`Special case: Matched "${builderName}" to Zain (${zainUserId})`);
        }
        else if (builderName && builderName !== "N/A") {
          // Convert builder name to lowercase for case-insensitive comparison
          const lowerBuilderName = builderName.toLowerCase().trim();
          
          // First try to find an exact match with displayName (highest priority)
          let exactDisplayNameMatch = null;
          
          for (const [id, { builder }] of builderIdentifiers.entries()) {
            if (builder.displayName && 
                builder.displayName.toLowerCase().trim() === lowerBuilderName) {
              exactDisplayNameMatch = builder;
              break;
            }
          }
          
          if (exactDisplayNameMatch) {
            builderId = exactDisplayNameMatch.id;
            matchedBuilderName = exactDisplayNameMatch.displayName;
            console.log(`Exact displayName match: "${builderName}" matches with "${matchedBuilderName}"`);
          } else {
            // If no exact match, try partial matches with displayName
            let partialDisplayNameMatch = null;
            let bestPartialScore = 0;
            
            for (const [id, { builder }] of builderIdentifiers.entries()) {
              if (builder.displayName) {
                const displayNameLower = builder.displayName.toLowerCase().trim();
                
                if (lowerBuilderName.includes(displayNameLower)) {
                  const score = displayNameLower.length / lowerBuilderName.length;
                  if (score > bestPartialScore) {
                    bestPartialScore = score;
                    partialDisplayNameMatch = builder;
                  }
                } else if (displayNameLower.includes(lowerBuilderName)) {
                  const score = lowerBuilderName.length / displayNameLower.length;
                  if (score > bestPartialScore) {
                    bestPartialScore = score;
                    partialDisplayNameMatch = builder;
                  }
                }
              }
            }
            
            if (partialDisplayNameMatch) {
              builderId = partialDisplayNameMatch.id;
              matchedBuilderName = partialDisplayNameMatch.displayName;
              console.log(`Partial displayName match: "${builderName}" matches with "${matchedBuilderName}" with score ${bestPartialScore}`);
            } else {
              // If still no match, fall back to the identifier-based matching
              let bestMatch = null;
              let bestMatchScore = 0;
              
              for (const [id, { builder, identifiers }] of builderIdentifiers.entries()) {
                // Check for exact matches first
                if (identifiers.includes(lowerBuilderName)) {
                  bestMatch = builder;
                  break;
                }
                
                // Check for partial matches
                for (const identifier of identifiers) {
                  // Calculate a match score based on how much of the identifier is contained in the builder name
                  // or how much of the builder name is contained in the identifier
                  if (lowerBuilderName.includes(identifier)) {
                    const score = identifier.length / lowerBuilderName.length;
                    if (score > bestMatchScore) {
                      bestMatchScore = score;
                      bestMatch = builder;
                    }
                  } else if (identifier.includes(lowerBuilderName)) {
                    const score = lowerBuilderName.length / identifier.length;
                    if (score > bestMatchScore) {
                      bestMatchScore = score;
                      bestMatch = builder;
                    }
                  }
                }
              }
              
              if (bestMatch) {
                builderId = bestMatch.id;
                matchedBuilderName = bestMatch.displayName || bestMatch.email;
                console.log(`Identifier match: "${builderName}" matches with "${matchedBuilderName}" (${builderId}) with score ${bestMatchScore}`);
              } else {
                console.log(`No matching builder found for "${builderName}"`);
              }
            }
          }
        }
        
        // If no builder matched, assign to admin
        if (!builderId) {
          const adminQuery = query(usersCollection, where("role", "==", "admin"));
          const adminSnapshot = await getDocs(adminQuery);
          
          if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0];
            builderId = adminDoc.id;
            matchedBuilderName = adminDoc.data().displayName || "Admin";
            console.log(`Assigned to admin: ${matchedBuilderName} (${builderId})`);
          } else {
            builderId = "unassigned";
            matchedBuilderName = "Unassigned";
            console.log("No admin found, using 'unassigned' as builderId");
          }
        }
        
        // Prepare lead data
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
          builder: matchedBuilderName || builderName,
          originalBuilderName: builderName,
          stage: "New Lead",
          stageManuallySet: false,
          
          // Timestamps
          timestamp: lead.timestamp ? new Date(lead.timestamp) : serverTimestamp(),
          
          // Additional metadata
          activities: [
            {
              type: "stage_change",
              title: "New Lead Created",
              description: `Lead has been submitted for ${matchedBuilderName || builderName || "unknown"}`,
              timestamp: new Date()
            }
          ],
          googleFormSubmission: true,
          googleSheetRowId: lead._id || null
        };
        
        // Add the lead to Firestore
        try {
          const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadData);
          console.log(`Added lead ${docRef.id} for builder ${matchedBuilderName || builderName}`);
          syncedCount++;
        } catch (addError) {
          console.error(`Error adding lead to Firestore:`, addError);
          
          // Extract document ID from error message if available
          const docIdMatch = addError.message.match(/document ([^\/]+\/[^\)]+)/);
          if (docIdMatch && docIdMatch[1]) {
            const parts = docIdMatch[1].split('/');
            if (parts.length === 2) {
              failedDocIds.push(parts[1]);
            }
          }
          
          errors.push({
            lead: lead.fullName,
            error: `Failed to add to Firestore: ${addError.message}`
          });
          errorCount++;
        }
      } catch (error) {
        console.error(`Error syncing lead ${lead.fullName || 'Unknown'}:`, error);
        errors.push({
          lead: lead.fullName || 'Unknown',
          error: error.message || 'Unknown error'
        });
        errorCount++;
      }
    }
    
    // Clean up any failed documents
    if (failedDocIds.length > 0) {
      const deletedCount = await cleanupFailedDocs(failedDocIds);
      console.log(`Cleaned up ${deletedCount} failed documents`);
    }
    
    const message = `Test sync completed: ${syncedCount} leads synced, ${skippedCount} skipped, ${errorCount} errors`;
    console.log(message);
    
    // Log detailed errors if any
    if (errors.length > 0) {
      console.log("Detailed errors:");
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Lead: ${err.lead}, Error: ${err.error}`);
      });
    }
    
    return {
      success: syncedCount > 0,
      message,
      syncedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : null,
      testMode: true,
      totalLeadsAvailable: googleLeads.length
    };
  } catch (error) {
    console.error("Error syncing test leads:", error);
    
    // Clean up any failed documents
    if (failedDocIds.length > 0) {
      const deletedCount = await cleanupFailedDocs(failedDocIds);
      console.log(`Cleaned up ${deletedCount} failed documents`);
    }
    
    return {
      success: false,
      message: `Error syncing test leads: ${error.message}`,
      syncedCount: 0,
      error: error.message,
      testMode: true
    };
  }
};

/**
 * Syncs all leads from Google Sheets to Firebase with improved builder matching
 * @param {boolean} forceSync - Whether to force sync leads even if they already exist
 * @returns {Promise<Object>} - Result of the sync operation
 */
export const syncAllLeadsToFirebase = async (forceSync = false) => {
  const failedDocIds = []; // Track document IDs of failed adds
  
  try {
    console.log(`Starting sync of all Google Sheets leads to Firebase${forceSync ? ' (force sync mode)' : ''}...`);
    
    // Get token for API request
    let token = localStorage.getItem("token");
    
    // If no token is found, try to generate a new one if the user is logged in
    if (!token && auth.currentUser) {
      try {
        console.log("No token found in localStorage. Generating a new one...");
        token = await generateAndStoreToken(auth.currentUser);
      } catch (tokenError) {
        console.error("Error generating token:", tokenError);
      }
    }
    
    if (!token) {
      console.error("Authentication token not found");
      return {
        success: false,
        message: "Authentication token not found",
        syncedCount: 0
      };
    }
    
    // Fetch leads from Google Sheets API
    let response;
    try {
      response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/google-leads`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (apiError) {
      console.error("Error fetching leads from Google Sheets API:", apiError.message);
      if (apiError.response) {
        console.error("API Response:", apiError.response.status, apiError.response.data);
      }
      return {
        success: false,
        message: `Error fetching leads: ${apiError.message}`,
        syncedCount: 0
      };
    }
    
    const googleLeads = response.data;
    if (!googleLeads || googleLeads.length === 0) {
      console.error("No leads found in Google Sheets");
      return {
        success: false,
        message: "No leads found in Google Sheets",
        syncedCount: 0
      };
    }
    
    console.log(`Found ${googleLeads.length} leads in Google Sheets`);
    
    // Get all builders from Firebase for matching
    const usersCollection = collection(db, USERS_COLLECTION);
    const buildersQuery = query(usersCollection, where("role", "==", "builder"));
    const buildersSnapshot = await getDocs(buildersQuery);
    
    const builders = [];
    buildersSnapshot.forEach(doc => {
      builders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${builders.length} builders in Firebase`);
    
    // Find Zain's user ID specifically
    let zainUserId = null;
    const zainQuery = query(usersCollection, where("email", "==", "gcconstruction@live.co.uk"));
    const zainSnapshot = await getDocs(zainQuery);
    if (!zainSnapshot.empty) {
      zainUserId = zainSnapshot.docs[0].id;
      console.log("Found Zain's user ID:", zainUserId);
    }
    
    // Create a map of builder identifiers for flexible matching
    const builderIdentifiers = new Map();
    
    // For each builder, create a set of possible identifiers
    builders.forEach(builder => {
      const identifiers = new Set();
      
      // Add display name if available (highest priority)
      if (builder.displayName) {
        identifiers.add(builder.displayName.toLowerCase());
        
        // Add each word of the display name (for partial matches)
        builder.displayName.split(/\s+/).forEach(word => {
          if (word.length > 2) { // Only consider words longer than 2 chars
            identifiers.add(word.toLowerCase());
          }
        });
      }
      
      // Extract username from email as a fallback (lower priority)
      if (builder.email) {
        const username = builder.email.split('@')[0];
        
        // Add variations of username (split by common separators)
        username.split(/[._-]/).forEach(part => {
          if (part.length > 2) { // Only consider parts longer than 2 chars
            identifiers.add(part.toLowerCase());
          }
        });
      }
      
      builderIdentifiers.set(builder.id, {
        builder,
        identifiers: [...identifiers],
        displayName: builder.displayName || "",
        email: builder.email || ""
      });
      
      console.log(`Builder ${builder.displayName || builder.email} identifiers:`, [...identifiers]);
    });
    
    // Get existing leads from Firebase to avoid duplicates
    const leadsCollection = collection(db, LEADS_COLLECTION);
    const existingLeadsSnapshot = await getDocs(leadsCollection);
    
    // Create a map of existing leads by email and phone for quick lookup
    const existingLeadsByEmail = new Map();
    const existingLeadsByPhone = new Map();
    
    console.log(`Found ${existingLeadsSnapshot.size} existing leads in Firebase, creating lookup maps...`);
    
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
    
    console.log(`Created lookup maps: ${existingLeadsByEmail.size} emails, ${existingLeadsByPhone.size} phone numbers`);
    
    // Log a few examples for debugging
    if (existingLeadsByEmail.size > 0) {
      console.log("Sample emails in lookup:", Array.from(existingLeadsByEmail.keys()).slice(0, 3));
    }
    if (existingLeadsByPhone.size > 0) {
      console.log("Sample phone numbers in lookup:", Array.from(existingLeadsByPhone.keys()).slice(0, 3));
    }
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let errors = []; // Track specific errors
    
    // Process each lead from Google Sheets
    for (const lead of googleLeads) {
      try {
        // Skip leads without essential information
        if (!lead.fullName || (!lead.phoneNumber && !lead.email)) {
          console.log(`Skipping lead with insufficient data: ${lead.fullName || 'Unknown'}`);
          skippedCount++;
          continue;
        }
        
        // Add more detailed logging to understand why leads are being skipped
        console.log(`Processing lead: ${lead.fullName}, Phone: ${lead.phoneNumber}, Email: ${lead.email}`);
        
        // Check if lead already exists by email (skip if forceSync is true)
        let existingLead = null;
        if (!forceSync && lead.email) {
          existingLead = existingLeadsByEmail.get(lead.email.toLowerCase());
          if (existingLead) {
            console.log(`Lead with email ${lead.email} already exists in Firebase (ID: ${existingLead.id})`);
            skippedCount++;
            continue;
          }
        }
        
        // Check if lead already exists by phone (skip if forceSync is true)
        if (!forceSync && !existingLead && lead.phoneNumber) {
          // Normalize phone number by removing non-digits
          const normalizedPhone = lead.phoneNumber.replace(/\D/g, '');
          if (normalizedPhone) {
            existingLead = existingLeadsByPhone.get(normalizedPhone);
            if (existingLead) {
              console.log(`Lead with phone ${lead.phoneNumber} already exists in Firebase (ID: ${existingLead.id})`);
              skippedCount++;
              continue;
            }
          }
        }
        
        // Find the matching builder
        const builderName = lead.builder || "N/A";
        let builderId = null;
        let matchedBuilderName = null;
        
        // Special case for Zain - check if the builder name contains "Zain"
        if (zainUserId && builderName.toLowerCase().includes("zain")) {
          builderId = zainUserId;
          matchedBuilderName = "Zain";
          console.log(`Special case: Matched "${builderName}" to Zain (${zainUserId})`);
        }
        else if (builderName && builderName !== "N/A") {
          // Convert builder name to lowercase for case-insensitive comparison
          const lowerBuilderName = builderName.toLowerCase().trim();
          
          // First try to find an exact match with displayName (highest priority)
          let exactDisplayNameMatch = null;
          
          for (const [id, { builder }] of builderIdentifiers.entries()) {
            if (builder.displayName && 
                builder.displayName.toLowerCase().trim() === lowerBuilderName) {
              exactDisplayNameMatch = builder;
              break;
            }
          }
          
          if (exactDisplayNameMatch) {
            builderId = exactDisplayNameMatch.id;
            matchedBuilderName = exactDisplayNameMatch.displayName;
            console.log(`Exact displayName match: "${builderName}" matches with "${matchedBuilderName}"`);
          } else {
            // If no exact match, try partial matches with displayName
            let partialDisplayNameMatch = null;
            let bestPartialScore = 0;
            
            for (const [id, { builder }] of builderIdentifiers.entries()) {
              if (builder.displayName) {
                const displayNameLower = builder.displayName.toLowerCase().trim();
                
                if (lowerBuilderName.includes(displayNameLower)) {
                  const score = displayNameLower.length / lowerBuilderName.length;
                  if (score > bestPartialScore) {
                    bestPartialScore = score;
                    partialDisplayNameMatch = builder;
                  }
                } else if (displayNameLower.includes(lowerBuilderName)) {
                  const score = lowerBuilderName.length / displayNameLower.length;
                  if (score > bestPartialScore) {
                    bestPartialScore = score;
                    partialDisplayNameMatch = builder;
                  }
                }
              }
            }
            
            if (partialDisplayNameMatch) {
              builderId = partialDisplayNameMatch.id;
              matchedBuilderName = partialDisplayNameMatch.displayName;
              console.log(`Partial displayName match: "${builderName}" matches with "${matchedBuilderName}" with score ${bestPartialScore}`);
            } else {
              // If still no match, fall back to the identifier-based matching
              let bestMatch = null;
              let bestMatchScore = 0;
              
              for (const [id, { builder, identifiers }] of builderIdentifiers.entries()) {
                // Check for exact matches first
                if (identifiers.includes(lowerBuilderName)) {
                  bestMatch = builder;
                  break;
                }
                
                // Check for partial matches
                for (const identifier of identifiers) {
                  // Calculate a match score based on how much of the identifier is contained in the builder name
                  // or how much of the builder name is contained in the identifier
                  if (lowerBuilderName.includes(identifier)) {
                    const score = identifier.length / lowerBuilderName.length;
                    if (score > bestMatchScore) {
                      bestMatchScore = score;
                      bestMatch = builder;
                    }
                  } else if (identifier.includes(lowerBuilderName)) {
                    const score = lowerBuilderName.length / identifier.length;
                    if (score > bestMatchScore) {
                      bestMatchScore = score;
                      bestMatch = builder;
                    }
                  }
                }
              }
              
              if (bestMatch) {
                builderId = bestMatch.id;
                matchedBuilderName = bestMatch.displayName || bestMatch.email;
                console.log(`Identifier match: "${builderName}" matches with "${matchedBuilderName}" (${builderId}) with score ${bestMatchScore}`);
              } else {
                console.log(`No matching builder found for "${builderName}"`);
              }
            }
          }
        }
        
        // If no builder matched, assign to admin
        if (!builderId) {
          const adminQuery = query(usersCollection, where("role", "==", "admin"));
          const adminSnapshot = await getDocs(adminQuery);
          
          if (!adminSnapshot.empty) {
            const adminDoc = adminSnapshot.docs[0];
            builderId = adminDoc.id;
            matchedBuilderName = adminDoc.data().displayName || "Admin";
            console.log(`Assigned to admin: ${matchedBuilderName} (${builderId})`);
          } else {
            builderId = "unassigned";
            matchedBuilderName = "Unassigned";
            console.log("No admin found, using 'unassigned' as builderId");
          }
        }
        
        // Prepare lead data
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
          builder: matchedBuilderName || builderName,
          originalBuilderName: builderName,
          stage: "New Lead",
          stageManuallySet: false,
          
          // Timestamps
          timestamp: lead.timestamp ? new Date(lead.timestamp) : serverTimestamp(),
          
          // Additional metadata
          activities: [
            {
              type: "stage_change",
              title: "New Lead Created",
              description: `Lead has been submitted for ${matchedBuilderName || builderName || "unknown"}`,
              timestamp: new Date()
            }
          ],
          googleFormSubmission: true,
          googleSheetRowId: lead._id || null
        };
        
        // Add the lead to Firestore
        try {
          const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadData);
          console.log(`Added lead ${docRef.id} for builder ${matchedBuilderName || builderName}`);
          syncedCount++;
        } catch (addError) {
          console.error(`Error adding lead to Firestore:`, addError);
          
          // Extract document ID from error message if available
          const docIdMatch = addError.message.match(/document ([^\/]+\/[^\)]+)/);
          if (docIdMatch && docIdMatch[1]) {
            const parts = docIdMatch[1].split('/');
            if (parts.length === 2) {
              failedDocIds.push(parts[1]);
            }
          }
          
          errors.push({
            lead: lead.fullName,
            error: `Failed to add to Firestore: ${addError.message}`
          });
          errorCount++;
        }
      } catch (error) {
        console.error(`Error syncing lead ${lead.fullName || 'Unknown'}:`, error);
        errors.push({
          lead: lead.fullName || 'Unknown',
          error: error.message || 'Unknown error'
        });
        errorCount++;
      }
    }
    
    // Clean up any failed documents
    if (failedDocIds.length > 0) {
      const deletedCount = await cleanupFailedDocs(failedDocIds);
      console.log(`Cleaned up ${deletedCount} failed documents`);
    }
    
    const message = `Sync completed: ${syncedCount} leads synced, ${skippedCount} skipped, ${errorCount} errors`;
    console.log(message);
    
    // Log detailed errors if any
    if (errors.length > 0) {
      console.log("Detailed errors:");
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Lead: ${err.lead}, Error: ${err.error}`);
      });
    }
    
    return {
      success: syncedCount > 0,
      message,
      syncedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error("Error syncing leads:", error);
    
    // Clean up any failed documents
    if (failedDocIds.length > 0) {
      const deletedCount = await cleanupFailedDocs(failedDocIds);
      console.log(`Cleaned up ${deletedCount} failed documents`);
    }
    
    return {
      success: false,
      message: `Error syncing: ${error.message}`,
      syncedCount: 0,
      error: error.message
    };
  }
};

// Export a function that can be called from the browser console
window.syncAllLeadsToFirebase = syncAllLeadsToFirebase;
window.syncTestLeadsToFirebase = syncTestLeadsToFirebase; 