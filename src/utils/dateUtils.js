export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    let date;
    
    // Handle Firestore timestamp objects (with seconds and nanoseconds)
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Handle regular timestamp (number or string)
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date timestamp:", timestamp);
      return "Invalid date";
    }
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting timestamp:", error, timestamp);
    return "Invalid date";
  }
};

export const formatDayOfWeek = (timestamp) => {
  if (!timestamp) return "";
  
  try {
    let date;
    
    // Handle Firestore timestamp objects (with seconds and nanoseconds)
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Handle regular timestamp (number or string)
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }
    
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  } catch (error) {
    console.error("Error formatting day of week:", error);
    return "";
  }
};

export const formatWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
  