import { db } from "../firebase/config";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

/**
 * Deletes all documents in a collection
 * @param {string} collectionName - Name of the collection to delete
 * @returns {Promise<number>} - Number of documents deleted
 */
export const deleteCollection = async (collectionName) => {
  try {
    console.log(`Starting deletion of collection: ${collectionName}`);
    
    // Get all documents in the collection
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    if (querySnapshot.empty) {
      console.log(`Collection ${collectionName} is already empty`);
      return 0;
    }
    
    // Count documents
    const docCount = querySnapshot.size;
    console.log(`Found ${docCount} documents in ${collectionName}`);
    
    // Use batched writes for better performance
    const batchSize = 500; // Firestore limit is 500 operations per batch
    let deleteCount = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    
    // Process documents in batches
    for (const docSnapshot of querySnapshot.docs) {
      batch.delete(doc(db, collectionName, docSnapshot.id));
      deleteCount++;
      batchCount++;
      
      // Commit batch when it reaches the limit
      if (batchCount >= batchSize) {
        console.log(`Committing batch of ${batchCount} deletions...`);
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
    
    // Commit any remaining operations
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} deletions...`);
      await batch.commit();
    }
    
    console.log(`Successfully deleted ${deleteCount} documents from ${collectionName}`);
    return deleteCount;
  } catch (error) {
    console.error(`Error deleting collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Deletes both leadData and leads collections
 * @returns {Promise<Object>} - Results of the deletion
 */
export const cleanupLeadCollections = async () => {
  try {
    console.log("Starting cleanup of lead collections...");
    
    // Delete leadData collection
    const leadDataCount = await deleteCollection("leadData");
    
    // Delete leads collection
    const leadsCount = await deleteCollection("leads");
    
    console.log("Cleanup completed successfully");
    
    return {
      success: true,
      leadDataDeleted: leadDataCount,
      leadsDeleted: leadsCount,
      message: `Successfully deleted ${leadDataCount} documents from leadData and ${leadsCount} documents from leads`
    };
  } catch (error) {
    console.error("Error during cleanup:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to complete cleanup"
    };
  }
};

// Export a function that can be called from the browser console
window.cleanupLeadCollections = cleanupLeadCollections; 