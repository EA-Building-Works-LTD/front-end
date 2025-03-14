import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import axios from "axios";

const LEADS_COLLECTION = "leads";
const USERS_COLLECTION = "users";

/**
 * Syncs all leads from Google Sheets to Firebase with improved builder matching
 * This can be run from the browser console to ensure all leads are properly assigned
 */
export const syncAllLeadsToFirebase = async () => {
  try {
    console.log("Starting sync of all Google Sheets leads to Firebase...");
    
    // Get token for API request
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Authentication token not found");
      return {
        success: false,
        message: "Authentication token not found",
        syncedCount: 0
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
    for (const lead of googleLeads) {
      try {
        // Skip leads without essential information
        if (!lead.fullName || (!lead.phoneNumber && !lead.email)) {
          console.log(`Skipping lead with insufficient data: ${lead.fullName || 'Unknown'}`);
          skippedCount++;
          continue;
        }
        
        // Check if lead already exists by email
        let existingLead = null;
        if (lead.email) {
          existingLead = existingLeadsByEmail.get(lead.email.toLowerCase());
          if (existingLead) {
            console.log(`Lead with email ${lead.email} already exists in Firebase (ID: ${existingLead.id})`);
            skippedCount++;
            continue;
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
              timestamp: serverTimestamp()
            }
          ],
          googleFormSubmission: true,
          googleSheetRowId: lead._id || null
        };
        
        // Add the lead to Firestore
        const docRef = await addDoc(collection(db, LEADS_COLLECTION), leadData);
        
        console.log(`Added lead ${docRef.id} for builder ${matchedBuilderName || builderName}`);
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing lead ${lead.fullName || 'Unknown'}:`, error);
        errorCount++;
      }
    }
    
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
    console.error("Error syncing leads:", error);
    return {
      success: false,
      message: `Error syncing: ${error.message}`,
      syncedCount: 0
    };
  }
};

// Export a function that can be called from the browser console
window.syncAllLeadsToFirebase = syncAllLeadsToFirebase; 