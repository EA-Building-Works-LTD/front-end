import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./config";
import { addLead } from "./leads";

const USERS_COLLECTION = "users";

/**
 * Submit a new lead form to Firebase
 * @param {Object} formData - The form data
 * @returns {Promise<string>} - ID of the new lead
 */
export const submitLeadForm = async (formData) => {
  try {
    // Extract builder name from form data
    const builderName = formData.builder || "";
    
    // Find the builder's UID in Firebase
    let builderId = null;
    
    if (builderName) {
      const usersCollection = collection(db, USERS_COLLECTION);
      const builderQuery = query(
        usersCollection,
        where("username", "==", builderName)
      );
      
      const builderSnapshot = await getDocs(builderQuery);
      
      if (!builderSnapshot.empty) {
        builderId = builderSnapshot.docs[0].id;
      }
    }
    
    // If builder not found, assign to a default admin user
    // You might want to change this logic based on your requirements
    if (!builderId) {
      // Get the first admin user as a fallback
      const usersCollection = collection(db, USERS_COLLECTION);
      const adminQuery = query(
        usersCollection,
        where("role", "==", "admin")
      );
      
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        builderId = adminSnapshot.docs[0].id;
      } else {
        // If no admin found, use a placeholder ID
        builderId = "unassigned";
      }
    }
    
    // Prepare lead data
    const leadData = {
      fullName: formData.fullName || "",
      phoneNumber: formData.phoneNumber || "",
      email: formData.email || "",
      address: formData.address || "",
      city: formData.city || "",
      workRequired: formData.workRequired || "",
      details: formData.details || "",
      budget: formData.budget || "",
      startDate: formData.startDate || "",
      contactPreference: formData.contactPreference || "",
      builderId: builderId,
      builder: builderName, // Keep the original builder name for reference
      stage: "New Lead",
      stageManuallySet: false,
      timestamp: serverTimestamp(),
      activities: [
        {
          type: "stage_change",
          title: "New Lead Created",
          description: `Lead has been submitted for ${builderName || "unknown"}`,
          timestamp: serverTimestamp()
        }
      ]
    };
    
    // Add the lead to Firestore
    const leadId = await addLead(leadData);
    
    return leadId;
  } catch (error) {
    console.error("Error submitting lead form:", error);
    throw error;
  }
}; 