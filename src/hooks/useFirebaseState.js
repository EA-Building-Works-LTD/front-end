import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { getAuth } from "firebase/auth";

/**
 * A hook that manages state with Firebase Firestore, similar to useState but persisted in Firestore.
 * Optimized to reduce Firestore operations and stay within free quotas.
 * @param {string} collection - The Firestore collection to use
 * @param {string} docId - The document ID within the collection
 * @param {string} field - The field within the document to store the state
 * @param {any} initialValue - The initial value if no value exists in Firestore
 * @returns {[any, function, boolean, Error]} - A stateful value, update function, loading state, and error
 */
export default function useFirebaseState(collection, docId, field, initialValue) {
  // Local state to hold the value
  const [state, setState] = useState(initialValue);
  // Loading state to track when data is being fetched
  const [loading, setLoading] = useState(true);
  // Error state to track any errors
  const [error, setError] = useState(null);
  // Debounce timer for batching updates
  const updateTimerRef = useRef(null);
  // Queue for pending updates
  const pendingUpdatesRef = useRef(null);
  // Last synced value to avoid unnecessary updates
  const lastSyncedValueRef = useRef(null);
  // Flag to track if initial data has been loaded
  const initialLoadDoneRef = useRef(false);
  // Flag to prevent snapshot updates from triggering writes
  const isLocalUpdateRef = useRef(false);
  // Reference to the document
  const docRef = useRef(doc(db, collection, docId));

  // Effect to fetch initial data and set up real-time listener
  useEffect(() => {
    // Debug auth state
    const auth = getAuth();
    const currentUser = auth.currentUser;
    //console.log("useFirebaseState Debug - Auth state:", currentUser ? "Authenticated" : "Not authenticated");
    if (currentUser) {
      // console.log("useFirebaseState Debug - User ID:", currentUser.uid);
    }
    // console.log("useFirebaseState Debug - Accessing collection:", collection, "document:", docId, "field:", field);

    // Update document reference if collection or docId changes
    docRef.current = doc(db, collection, docId);
    
    // Use a local variable to track if this effect instance is still mounted
    let isMounted = true;
    
    // First try to get data from cache
    const fetchInitialData = async () => {
      try {
        const docSnap = await getDoc(docRef.current);
        
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // console.log("useFirebaseState Debug - Document data:", data);
          if (field in data) {
            // Set local state and mark as synced
            setState(data[field]);
            lastSyncedValueRef.current = JSON.stringify(data[field]);
          } else if (!initialLoadDoneRef.current) {
            // Only initialize if we haven't loaded data before
            //  console.log("useFirebaseState Debug - Field doesn't exist, using initial value");
            // Don't immediately write to Firestore, wait for an actual update
          }
        } else if (!initialLoadDoneRef.current) {
          // Only log and initialize if we haven't loaded data before
          // console.log("useFirebaseState Debug - Document doesn't exist, using initial value");
          // Don't immediately create the document, wait for an actual update
        }
        
        initialLoadDoneRef.current = true;
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        
        // console.error("Error getting document:", err);
        // console.error("Error details:", err.code, err.message);
        // console.error("Document path:", collection + "/" + docId);
        setError(err);
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up a real-time listener with a reduced snapshot frequency
    const unsubscribe = onSnapshot(
      docRef.current,
      { includeMetadataChanges: true }, // Include metadata to detect local vs server changes
      (docSnap) => {
        if (!isMounted) return;
        
        // Skip if this is a local update we just made
        if (docSnap.metadata.hasPendingWrites) {
          // console.log("useFirebaseState Debug - Skipping local update");
          return;
        }
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (field in data) {
            const newValueStr = JSON.stringify(data[field]);
            if (newValueStr !== lastSyncedValueRef.current) {
              // console.log("useFirebaseState Debug - Remote update detected");
              setState(data[field]);
              lastSyncedValueRef.current = newValueStr;
            }
          }
        }
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        
        // console.error("Error getting document:", err);
        // console.error("Error details:", err.code, err.message);
        // console.error("Document path:", collection + "/" + docId);
        setError(err);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts
    return () => {
      isMounted = false;
      unsubscribe();
      
      // Clear any pending updates
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [collection, docId, field]); // Remove initialValue from dependencies to prevent re-renders

  // Function to update the value in Firestore with debouncing
  const updateFirestore = async (newValue) => {
    // Store the pending update
    pendingUpdatesRef.current = newValue;
    
    // If there's already a timer, don't set a new one
    if (updateTimerRef.current) return;
    
    // Set a timer to batch updates
    updateTimerRef.current = setTimeout(async () => {
      try {
        // Get the latest pending update
        const valueToStore = pendingUpdatesRef.current;
        
        // Skip update if the value hasn't changed from what's in Firestore
        const valueToStoreStr = JSON.stringify(valueToStore);
        if (valueToStoreStr === lastSyncedValueRef.current) {
          // console.log("useFirebaseState Debug - Skipping update, value unchanged");
          updateTimerRef.current = null;
          pendingUpdatesRef.current = null;
          return;
        }
        
        // Debug auth state before update
        // const auth = getAuth();
        // const currentUser = auth.currentUser;
        // console.log("useFirebaseState Debug - Before update - Auth state:", currentUser ? "Authenticated" : "Not authenticated");
        
        // Mark this as a local update to prevent the snapshot listener from updating state
        isLocalUpdateRef.current = true;
        
        // Get the current document
        const docSnap = await getDoc(docRef.current);
        
        if (docSnap.exists()) {
          // Update the existing document with the new field value
            console.log("useFirebaseState Debug - Updating existing document:", collection + "/" + docId);
          await setDoc(docRef.current, { [field]: valueToStore }, { merge: true });
        } else {
          // Create a new document with the field
            console.log("useFirebaseState Debug - Creating new document:", collection + "/" + docId);
          await setDoc(docRef.current, { [field]: valueToStore });
        }
        
        // Update the last synced value
        lastSyncedValueRef.current = valueToStoreStr;
        
        // Reset local update flag after a short delay to ensure snapshot has fired
        setTimeout(() => {
          isLocalUpdateRef.current = false;
        }, 500);
      } catch (err) {
        // console.error("Error updating document:", err);
        // console.error("Error details:", err.code, err.message);
        // console.error("Document path:", collection + "/" + docId);
        setError(err);
      } finally {
        // Clear the timer and pending updates
        updateTimerRef.current = null;
        pendingUpdatesRef.current = null;
      }
    }, 500); // 500ms debounce for faster updates
  };

  // Function to update both local state and Firestore
  const updateState = (newValue) => {
    // If newValue is a function, call it with the current state
    const valueToStore = newValue instanceof Function ? newValue(state) : newValue;
    
    // Skip if the value hasn't changed
    const valueToStoreStr = JSON.stringify(valueToStore);
    if (valueToStoreStr === lastSyncedValueRef.current) {
      console.log("useFirebaseState Debug - Skipping update, value unchanged");
      return;
    }
    
    // Update local state immediately for responsive UI
    setState(valueToStore);
    
    // Update Firestore (async with debouncing)
    updateFirestore(valueToStore);
  };

  return [state, updateState, loading, error];
} 