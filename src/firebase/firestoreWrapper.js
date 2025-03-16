import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";
import rateLimiter from "./rateLimiter";
import batchManager from "./batchUtils";

/**
 * Optimized Firestore wrapper with rate limiting and batching
 */
class FirestoreWrapper {
  constructor() {
    // Cache for active listeners to prevent duplicate listeners
    this.activeListeners = new Map();
    // Cache for last values to prevent unnecessary updates
    this.lastValues = new Map();
  }

  /**
   * Get a document with rate limiting
   * @param {string} collectionPath - Collection path
   * @param {string} docId - Document ID
   * @returns {Promise<Object|null>} - Document data or null
   */
  async getDocument(collectionPath, docId) {
    // Check rate limit
    if (!rateLimiter.trackRead()) {
      console.warn(`Rate limit reached, using cached data for ${collectionPath}/${docId}`);
      // Try to get from localStorage cache
      const cachedData = this.getFromCache(collectionPath, docId);
      if (cachedData) {
        return cachedData;
      }
      // If no cache, return empty object
      return null;
    }
    
    try {
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Cache the data
        this.saveToCache(collectionPath, docId, data);
        return data;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting document ${collectionPath}/${docId}:`, error);
      // Try to get from cache as fallback
      return this.getFromCache(collectionPath, docId);
    }
  }
  
  /**
   * Query documents with rate limiting
   * @param {string} collectionPath - Collection path
   * @param {Array} conditions - Array of query conditions [field, operator, value]
   * @param {Array} orderByFields - Array of fields to order by
   * @param {number} limitCount - Number of documents to limit to
   * @returns {Promise<Array>} - Array of documents
   */
  async queryDocuments(collectionPath, conditions = [], orderByFields = [], limitCount = 0) {
    // Generate cache key for this query
    const cacheKey = this.generateQueryCacheKey(collectionPath, conditions, orderByFields, limitCount);
    
    // Check rate limit
    if (!rateLimiter.trackRead()) {
      console.warn(`Rate limit reached, using cached data for query ${cacheKey}`);
      // Try to get from localStorage cache
      const cachedData = this.getFromCache('queries', cacheKey);
      if (cachedData) {
        return cachedData;
      }
      // If no cache, return empty array
      return [];
    }
    
    try {
      let q = collection(db, collectionPath);
      
      // Add conditions
      conditions.forEach(([field, operator, value]) => {
        q = query(q, where(field, operator, value));
      });
      
      // Add orderBy
      orderByFields.forEach(field => {
        q = query(q, orderBy(field));
      });
      
      // Add limit
      if (limitCount > 0) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const results = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        results.push(data);
        
        // Cache individual documents
        this.saveToCache(collectionPath, doc.id, data);
      });
      
      // Cache the query results
      this.saveToCache('queries', cacheKey, results);
      
      return results;
    } catch (error) {
      console.error(`Error querying documents in ${collectionPath}:`, error);
      // Try to get from cache as fallback
      return this.getFromCache('queries', cacheKey) || [];
    }
  }
  
  /**
   * Set a document with batching
   * @param {string} collectionPath - Collection path
   * @param {string} docId - Document ID
   * @param {Object} data - Document data
   * @param {Object} options - Set options
   */
  setDocument(collectionPath, docId, data, options = {}) {
    // Track write operation
    if (!rateLimiter.trackWrite()) {
      console.error(`Write rate limit reached, cannot set document ${collectionPath}/${docId}`);
      return;
    }
    
    // Add timestamp
    const dataWithTimestamp = {
      ...data,
      updatedAt: Timestamp.now()
    };
    
    // Add to batch
    batchManager.set(collectionPath, docId, dataWithTimestamp, options);
    
    // Update cache immediately for responsive UI
    this.saveToCache(collectionPath, docId, dataWithTimestamp);
    
    // Update last value to prevent duplicate updates
    const key = `${collectionPath}/${docId}`;
    this.lastValues.set(key, JSON.stringify(dataWithTimestamp));
  }
  
  /**
   * Update a document with batching
   * @param {string} collectionPath - Collection path
   * @param {string} docId - Document ID
   * @param {Object} data - Fields to update
   */
  updateDocument(collectionPath, docId, data) {
    // Track write operation
    if (!rateLimiter.trackWrite()) {
      console.error(`Write rate limit reached, cannot update document ${collectionPath}/${docId}`);
      return;
    }
    
    // Add timestamp
    const dataWithTimestamp = {
      ...data,
      updatedAt: Timestamp.now()
    };
    
    // Add to batch
    batchManager.update(collectionPath, docId, dataWithTimestamp);
    
    // Update cache with merged data
    const cachedData = this.getFromCache(collectionPath, docId);
    if (cachedData) {
      const updatedData = {
        ...cachedData,
        ...dataWithTimestamp
      };
      this.saveToCache(collectionPath, docId, updatedData);
      
      // Update last value to prevent duplicate updates
      const key = `${collectionPath}/${docId}`;
      this.lastValues.set(key, JSON.stringify(updatedData));
    }
  }
  
  /**
   * Delete a document with batching
   * @param {string} collectionPath - Collection path
   * @param {string} docId - Document ID
   */
  deleteDocument(collectionPath, docId) {
    // Track delete operation
    if (!rateLimiter.trackDelete()) {
      console.error(`Delete rate limit reached, cannot delete document ${collectionPath}/${docId}`);
      return;
    }
    
    // Add to batch
    batchManager.delete(collectionPath, docId);
    
    // Remove from cache
    this.removeFromCache(collectionPath, docId);
    
    // Remove from last values
    const key = `${collectionPath}/${docId}`;
    this.lastValues.delete(key);
  }
  
  /**
   * Set up a real-time listener with rate limiting
   * @param {string} collectionPath - Collection path
   * @param {string} docId - Document ID
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  listenToDocument(collectionPath, docId, callback) {
    // Generate a unique key for this listener
    const listenerKey = `${collectionPath}/${docId}`;
    
    // Check if we already have an active listener for this document
    if (this.activeListeners.has(listenerKey)) {
      console.log(`Already listening to ${listenerKey}, reusing existing listener`);
      
      // Update the timestamp to prevent cleanup
      const existingListener = this.activeListeners.get(listenerKey);
      existingListener.timestamp = Date.now();
      this.activeListeners.set(listenerKey, existingListener);
      
      return this.activeListeners.get(listenerKey).unsubscribe;
    }
    
    // Track read operation
    if (!rateLimiter.trackRead()) {
      console.warn(`Rate limit reached, using cached data for ${listenerKey}`);
      // Try to get from localStorage cache
      const cachedData = this.getFromCache(collectionPath, docId);
      if (cachedData) {
        // Call callback with cached data
        callback(cachedData);
      }
      
      // Return dummy unsubscribe function
      return () => {};
    }
    
    const docRef = doc(db, collectionPath, docId);
    
    // Use server-only changes to reduce bandwidth
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        // Skip local updates to prevent loops
        if (docSnap.metadata.hasPendingWrites) {
          console.log(`Skipping local update for ${listenerKey}`);
          return;
        }
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Check if the data has actually changed
          const dataStr = JSON.stringify(data);
          if (this.lastValues.get(listenerKey) === dataStr) {
            console.log(`Data unchanged for ${listenerKey}, skipping update`);
            return;
          }
          
          // Update last value
          this.lastValues.set(listenerKey, dataStr);
          
          // Cache the data
          this.saveToCache(collectionPath, docId, data);
          
          // Call callback with a new object to ensure React detects the change
          callback({...data, id: docId});
        } else {
          // Document doesn't exist
          this.lastValues.delete(listenerKey);
          this.removeFromCache(collectionPath, docId);
          callback(null);
        }
      },
      (error) => {
        console.error(`Error listening to document ${listenerKey}:`, error);
        // Try to get from cache as fallback
        const cachedData = this.getFromCache(collectionPath, docId);
        if (cachedData) {
          callback(cachedData);
        } else {
          callback(null);
        }
      }
    );
    
    // Store the unsubscribe function
    this.activeListeners.set(listenerKey, {
      unsubscribe,
      timestamp: Date.now()
    });
    
    // Return a wrapper unsubscribe function that also removes from our map
    return () => {
      console.log(`Unsubscribing from ${listenerKey}`);
      unsubscribe();
      this.activeListeners.delete(listenerKey);
      // Also clean up the last value to prevent stale comparisons
      this.lastValues.delete(listenerKey);
    };
  }
  
  /**
   * Save data to localStorage cache
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {Object} data - Data to cache
   */
  saveToCache(collection, id, data) {
    try {
      const cacheKey = `firestore_cache_${collection}_${id}`;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }
  
  /**
   * Get data from localStorage cache
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Object|null} - Cached data or null
   */
  getFromCache(collection, id) {
    try {
      const cacheKey = `firestore_cache_${collection}_${id}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);
        
        // Check if cache is still valid (24 hours)
        const now = Date.now();
        const cacheAge = now - timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge <= maxAge) {
          return data;
        }
        
        // Cache is too old, remove it
        localStorage.removeItem(cacheKey);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }
  
  /**
   * Remove data from localStorage cache
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   */
  removeFromCache(collection, id) {
    try {
      const cacheKey = `firestore_cache_${collection}_${id}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }
  
  /**
   * Generate a cache key for a query
   * @param {string} collection - Collection name
   * @param {Array} conditions - Query conditions
   * @param {Array} orderByFields - Order by fields
   * @param {number} limitCount - Limit count
   * @returns {string} - Cache key
   */
  generateQueryCacheKey(collection, conditions, orderByFields, limitCount) {
    const conditionsStr = conditions.map(c => `${c[0]}_${c[1]}_${c[2]}`).join('|');
    const orderByStr = orderByFields.join('|');
    return `${collection}_${conditionsStr}_${orderByStr}_${limitCount}`;
  }
  
  /**
   * Get current usage statistics
   * @returns {Object} - Usage statistics
   */
  getUsageStats() {
    return rateLimiter.getStats();
  }
  
  /**
   * Flush any pending batch operations
   */
  async flushBatch() {
    await batchManager.flush();
  }
  
  /**
   * Clean up old listeners that haven't been used in a while
   */
  cleanupListeners() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes (reduced from 30 minutes)
    let cleanedCount = 0;
    
    for (const [key, { unsubscribe, timestamp }] of this.activeListeners.entries()) {
      if (now - timestamp > maxAge) {
        console.log(`Cleaning up old listener for ${key}`);
        unsubscribe();
        this.activeListeners.delete(key);
        this.lastValues.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old listeners`);
    }
    
    // Also clean up localStorage cache periodically
    this.cleanupCache();
  }
  
  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    try {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let cleanedCount = 0;
      
      // Find all firestore cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('firestore_cache_')) {
          try {
            const cachedItem = localStorage.getItem(key);
            if (cachedItem) {
              const { timestamp } = JSON.parse(cachedItem);
              if (now - timestamp > maxAge) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch (error) {
            // If we can't parse the item, remove it
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old cache entries`);
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
}

// Create a singleton instance
const firestoreDB = new FirestoreWrapper();

// Set up periodic cleanup of listeners
setInterval(() => {
  firestoreDB.cleanupListeners();
}, 5 * 60 * 1000); // Every 5 minutes (reduced from 15 minutes)

export default firestoreDB; 