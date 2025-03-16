import { writeBatch, doc } from "firebase/firestore";
import { db } from "./config";

/**
 * A utility class for batching Firestore operations to reduce quota usage
 */
class BatchManager {
  constructor() {
    this.pendingOperations = [];
    this.batchTimer = null;
    this.batchSize = 500; // Maximum operations per batch (Firestore limit is 500)
    this.batchDelay = 1000; // Delay in ms before committing batch
  }

  /**
   * Add a set operation to the batch
   * @param {string} collection - Collection path
   * @param {string} docId - Document ID
   * @param {Object} data - Document data
   * @param {Object} options - Set options (e.g. {merge: true})
   */
  set(collection, docId, data, options = {}) {
    this.pendingOperations.push({
      type: 'set',
      collection,
      docId,
      data,
      options
    });
    this.scheduleBatch();
  }

  /**
   * Add an update operation to the batch
   * @param {string} collection - Collection path
   * @param {string} docId - Document ID
   * @param {Object} data - Fields to update
   */
  update(collection, docId, data) {
    this.pendingOperations.push({
      type: 'update',
      collection,
      docId,
      data
    });
    this.scheduleBatch();
  }

  /**
   * Add a delete operation to the batch
   * @param {string} collection - Collection path
   * @param {string} docId - Document ID
   */
  delete(collection, docId) {
    this.pendingOperations.push({
      type: 'delete',
      collection,
      docId
    });
    this.scheduleBatch();
  }

  /**
   * Schedule a batch commit after a delay
   */
  scheduleBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.commitBatch();
    }, this.batchDelay);
  }

  /**
   * Commit the pending operations in batches
   */
  async commitBatch() {
    if (this.pendingOperations.length === 0) {
      return;
    }

    console.log(`BatchManager: Committing ${this.pendingOperations.length} operations`);

    try {
      // Process operations in chunks of batchSize
      for (let i = 0; i < this.pendingOperations.length; i += this.batchSize) {
        const batch = writeBatch(db);
        const chunk = this.pendingOperations.slice(i, i + this.batchSize);

        // Add each operation to the batch
        chunk.forEach(op => {
          const docRef = doc(db, op.collection, op.docId);

          switch (op.type) {
            case 'set':
              batch.set(docRef, op.data, op.options);
              break;
            case 'update':
              batch.update(docRef, op.data);
              break;
            case 'delete':
              batch.delete(docRef);
              break;
            default:
              console.error(`Unknown operation type: ${op.type}`);
          }
        });

        // Commit the batch
        await batch.commit();
        console.log(`BatchManager: Committed batch of ${chunk.length} operations`);
      }

      // Clear the pending operations
      this.pendingOperations = [];
    } catch (error) {
      console.error('Error committing batch:', error);
      // Keep the operations that failed to retry later
    }
  }

  /**
   * Commit any pending operations immediately
   */
  async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    await this.commitBatch();
  }
}

// Create a singleton instance
const batchManager = new BatchManager();

export default batchManager; 