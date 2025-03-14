import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * A hook that manages state with Firebase Firestore, similar to useState but persisted in Firestore.
 * @param {string} collection - The Firestore collection to use
 * @param {string} docId - The document ID within the collection
 * @param {string} field - The field within the document to store the state
 * @param {any} initialValue - The initial value if no value exists in Firestore
 * @returns {[any, function]} - A stateful value and a function to update it
 */
export default function useFirebaseState(collection, docId, field, initialValue) {
  // Local state to hold the value
  const [state, setState] = useState(initialValue);
  // Loading state to track when data is being fetched
  const [loading, setLoading] = useState(true);
  // Error state to track any errors
  const [error, setError] = useState(null);

  // Reference to the document
  const docRef = doc(db, collection, docId);

  // Effect to fetch initial data and set up real-time listener
  useEffect(() => {
    // Set up a real-time listener for the document
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (field in data) {
            setState(data[field]);
          } else {
            // Field doesn't exist in the document, use initial value
            setState(initialValue);
            // Initialize the field in Firestore
            updateFirestore(initialValue);
          }
        } else {
          // Document doesn't exist, use initial value
          setState(initialValue);
          // Initialize the document in Firestore
          updateFirestore(initialValue);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error getting document:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [collection, docId, field]); // Re-run if these dependencies change

  // Function to update the value in Firestore
  const updateFirestore = async (newValue) => {
    try {
      // Get the current document
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update the existing document with the new field value
        await setDoc(docRef, { [field]: newValue }, { merge: true });
      } else {
        // Create a new document with the field
        await setDoc(docRef, { [field]: newValue });
      }
    } catch (err) {
      console.error("Error updating document:", err);
      setError(err);
    }
  };

  // Function to update both local state and Firestore
  const updateState = (newValue) => {
    // If newValue is a function, call it with the current state
    const valueToStore = newValue instanceof Function ? newValue(state) : newValue;
    
    // Update local state immediately for responsive UI
    setState(valueToStore);
    
    // Update Firestore (async)
    updateFirestore(valueToStore);
  };

  return [state, updateState, loading, error];
} 