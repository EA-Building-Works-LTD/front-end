import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./config";
import { auth } from "./config";

const LEADS_COLLECTION = "leads";

/**
 * Get all leads for a specific builder
 * @param {string} builderId - The ID of the builder
 * @param {boolean} isAdmin - Whether the user is an admin
 * @returns {Promise<Array>} - Array of lead objects
 */
export const getLeadsByBuilder = async (builderId, isAdmin = false) => {
  try {
    //console.log(`Getting leads for builderId: ${builderId}, isAdmin: ${isAdmin}`);
    
    let leads = [];
    
    if (isAdmin) {
      // For admin users, fetch all leads without filtering by builderId
      //console.log("Admin user - fetching all leads");
      const q = query(
        collection(db, LEADS_COLLECTION),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        leads.push({
          _id: doc.id,
          ...doc.data()
        });
      });
      
      //console.log(`Admin user - found ${leads.length} total leads`);
      
      // Return all leads for admin users
      return leads;
    }
    
    // For regular builders, we need to fetch leads in two ways:
    // 1. Leads assigned by builderId
    // 2. Leads assigned by builder name (from Google Sheets or manual assignment)
    
    //console.log(`Builder user - filtering by builderId: ${builderId}`);
    
    // 1. First get leads assigned by builderId
    const builderIdQuery = query(
      collection(db, LEADS_COLLECTION),
      where("builderId", "==", builderId),
      orderBy("timestamp", "desc")
    );
    
    const builderIdSnapshot = await getDocs(builderIdQuery);
    
    builderIdSnapshot.forEach((doc) => {
      leads.push({
        _id: doc.id,
        ...doc.data()
      });
    });
    
    // 2. Then get leads assigned by builder name
    // Get the current user's display name and email
    const currentUser = auth.currentUser;
    if (currentUser) {
      const displayName = currentUser.displayName || "";
      const email = currentUser.email || "";
      // console.log(`Current builder: ${displayName || email}`);
      
      // Check if the user has a display name set
      if (displayName) {
        // console.log(`Looking for leads with builder name matching displayName: "${displayName}"`);
        
        // Get all leads for matching by display name
        const allLeadsQuery = query(
          collection(db, LEADS_COLLECTION),
          orderBy("timestamp", "desc")
        );
        
        const allLeadsSnapshot = await getDocs(allLeadsQuery);
        
        // Add leads where builder field matches the display name (case-insensitive)
        const existingIds = new Set(leads.map(lead => lead._id));
        
        allLeadsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip if we already have this lead or if it has no builder field
          if (existingIds.has(doc.id) || !data.builder) return;
          
          const builderLower = data.builder.toLowerCase().trim();
          const displayNameLower = displayName.toLowerCase().trim();
          
          // Check for exact or partial matches
          const isMatch = builderLower.includes(displayNameLower) || 
                         displayNameLower.includes(builderLower);
          
          if (isMatch) {
            // console.log(`Found lead by displayName match: "${data.builder}" matches with "${displayName}"`);
            leads.push({
              _id: doc.id,
              ...data
            });
            existingIds.add(doc.id);
          }
        });
        
        // console.log(`Found ${leads.length} total leads for builder with displayName: "${displayName}"`);
      }
      // Special case for Zain (email: gcconstruction@live.co.uk)
      else if (email.toLowerCase() === "gcconstruction@live.co.uk") {
        // console.log("Special case for Zain - looking for leads with 'Zain' in builder field");
        
        // Get all leads for Zain
        const zainLeadsQuery = query(
          collection(db, LEADS_COLLECTION),
          orderBy("timestamp", "desc")
        );
        
        const zainLeadsSnapshot = await getDocs(zainLeadsQuery);
        
        // Add leads where builder field contains "Zain" (case-insensitive)
        const existingIds = new Set(leads.map(lead => lead._id));
        
        zainLeadsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip if we already have this lead
          if (existingIds.has(doc.id)) return;
          
          // Check if builder field contains "Zain"
          if (data.builder && data.builder.toLowerCase().includes("zain")) {
            // console.log(`Found lead for Zain: ${doc.id} (builder: ${data.builder})`);
            leads.push({
              _id: doc.id,
              ...data
            });
            existingIds.add(doc.id);
          }
        });
      }
      // Fallback to email-based matching if no display name and not Zain
      else {
        // console.log("No displayName set - falling back to email-based matching");
        
        // Create a set of possible builder identifiers to match against
        const possibleMatches = new Set();
        
        // Extract username from email
        if (email) {
          const username = email.split('@')[0];
          possibleMatches.add(username.toLowerCase());
          
          // Add variations of username (split by common separators)
          username.split(/[._-]/).forEach(part => {
            if (part.length > 2) { // Only consider parts longer than 2 chars
              possibleMatches.add(part.toLowerCase());
            }
          });
        }
        
        // console.log("Possible builder name matches from email:", [...possibleMatches]);
        
        // Get all leads for partial matching
        const allLeadsQuery = query(
          collection(db, LEADS_COLLECTION),
          orderBy("timestamp", "desc")
        );
        
        const allLeadsSnapshot = await getDocs(allLeadsQuery);
        
        // Filter for partial matches
        const existingIds = new Set(leads.map(lead => lead._id));
        
        allLeadsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Skip if we already have this lead
          if (existingIds.has(doc.id) || !data.builder) return;
          
          const builderLower = data.builder.toLowerCase();
          
          // Check if any of our possible matches are contained in the builder field
          const isMatch = [...possibleMatches].some(match => 
            builderLower.includes(match) || match.includes(builderLower)
          );
          
          if (isMatch) {
            // console.log(`Found lead by partial match: "${data.builder}" matches with "${[...possibleMatches].find(m => builderLower.includes(m) || m.includes(builderLower))}"`);
            leads.push({
              _id: doc.id,
              ...data
            });
            existingIds.add(doc.id);
          }
        });
      }
    }
    
    // Sort the combined results by timestamp
    leads.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp?.seconds * 1000 || 0);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp?.seconds * 1000 || 0);
      return dateB - dateA;
    });
    
    //console.log(`Found ${leads.length} leads for builder`);
    return leads;
  } catch (error) {
    //console.error("Error getting leads:", error);
    throw error;
  }
};

/**
 * Get a single lead by ID
 * @param {string} leadId - The ID of the lead
 * @returns {Promise<Object>} - Lead object
 */
export const getLeadById = async (leadId) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        _id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error("Lead not found");
    }
  } catch (error) {
    //console.error("Error getting lead:", error);
    throw error;
  }
};

/**
 * Add a new lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<string>} - ID of the new lead
 */
export const addLead = async (leadData) => {
  try {
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), {
      ...leadData,
      timestamp: serverTimestamp(),
      stage: "New Lead"
    });
    
    return docRef.id;
  } catch (error) {
    //console.error("Error adding lead:", error);
    throw error;
  }
};

/**
 * Update a lead
 * @param {string} leadId - The ID of the lead to update
 * @param {Object} leadData - Updated lead data
 * @returns {Promise<void>}
 */
export const updateLead = async (leadId, leadData) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(docRef, leadData);
  } catch (error) {
    //console.error("Error updating lead:", error);
    throw error;
  }
};

/**
 * Delete a lead
 * @param {string} leadId - The ID of the lead to delete
 * @returns {Promise<void>}
 */
export const deleteLead = async (leadId) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(docRef);
  } catch (error) {
    //console.error("Error deleting lead:", error);
    throw error;
  }
};

/**
 * Update lead stage
 * @param {string} leadId - The ID of the lead
 * @param {string} stage - New stage value
 * @param {boolean} manuallySet - Whether the stage was manually set
 * @returns {Promise<void>}
 */
export const updateLeadStage = async (leadId, stage, manuallySet = true) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(docRef, { 
      stage, 
      stageManuallySet: manuallySet,
      stageUpdatedAt: serverTimestamp()
    });
  } catch (error) {
    //console.error("Error updating lead stage:", error);
    throw error;
  }
};

/**
 * Add an activity to a lead
 * @param {string} leadId - The ID of the lead
 * @param {Object} activity - Activity object
 * @returns {Promise<void>}
 */
export const addLeadActivity = async (leadId, activity) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const leadData = docSnap.data();
      const activities = leadData.activities || [];
      
      await updateDoc(docRef, {
        activities: [...activities, {
          ...activity,
          timestamp: serverTimestamp()
        }]
      });
    } else {
      throw new Error("Lead not found");
    }
  } catch (error) {
    //console.error("Error adding lead activity:", error);
    throw error;
  }
};

/**
 * Add an appointment to a lead
 * @param {string} leadId - The ID of the lead
 * @param {Object} appointment - Appointment object
 * @returns {Promise<void>}
 */
export const addLeadAppointment = async (leadId, appointment) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const leadData = docSnap.data();
      const appointments = leadData.appointments || [];
      
      await updateDoc(docRef, {
        appointments: [...appointments, appointment],
        appointmentDate: appointment.appointmentDate
      });
    } else {
      throw new Error("Lead not found");
    }
  } catch (error) {
    //console.error("Error adding lead appointment:", error);
    throw error;
  }
};

/**
 * Add a proposal to a lead
 * @param {string} leadId - The ID of the lead
 * @param {Object} proposal - Proposal object
 * @returns {Promise<void>}
 */
export const addLeadProposal = async (leadId, proposal) => {
  try {
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const leadData = docSnap.data();
      const proposals = leadData.proposals || [];
      
      await updateDoc(docRef, {
        proposals: [...proposals, proposal]
      });
    } else {
      throw new Error("Lead not found");
    }
  } catch (error) {
    //console.error("Error adding lead proposal:", error);
    throw error;
  }
};

/**
 * Assign a lead to a builder
 * @param {string} leadId - The ID of the lead
 * @param {string} builderId - The ID of the builder
 * @param {string} builderName - The name of the builder
 * @returns {Promise<void>}
 */
export const assignLeadToBuilder = async (leadId, builderId, builderName) => {
  try {
    // console.log(`Assigning lead ${leadId} to builder ${builderName} (${builderId})`);
    
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error("Lead not found");
    }
    
    // Update the lead with the new builder information
    await updateDoc(docRef, { 
      builderId,
      builder: builderName,
      assignedAt: serverTimestamp()
    });
    
    // Add an activity for the assignment
    const leadData = docSnap.data();
    const activities = leadData.activities || [];
    
    await updateDoc(docRef, {
      activities: [...activities, {
        type: "assignment",
        title: "Lead Assigned",
        description: `Lead assigned to ${builderName}`,
        timestamp: serverTimestamp()
      }]
    });
    
    // console.log(`Successfully assigned lead ${leadId} to builder ${builderName}`);
  } catch (error) {
    // console.error("Error assigning lead to builder:", error);
    throw error;
  }
}; 