/**
 * A utility to monitor Firestore operations to control costs on the Blaze plan
 */
class FirestoreRateLimiter {
  constructor() {
    // Daily limits for Blaze plan - set reasonable thresholds to control costs
    // These are not hard limits but monitoring thresholds
    this.dailyReadLimit = 100000;  // Increased from 45000
    this.dailyWriteLimit = 50000;  // Increased from 18000
    this.dailyDeleteLimit = 50000; // Increased from 18000
    
    // Track operations
    this.readCount = 0;
    this.writeCount = 0;
    this.deleteCount = 0;
    
    // Last reset time
    this.lastResetTime = Date.now();
    
    // Warning thresholds (percentage of limit)
    this.warningThreshold = 0.7; // 70%
    this.criticalThreshold = 0.9; // 90%
    
    // Warning flags
    this.readWarningIssued = false;
    this.writeWarningIssued = false;
    this.deleteWarningIssued = false;
    
    // Backoff tracking - less aggressive for Blaze plan
    this.consecutiveFailures = 0;
    this.lastBackoffTime = 0;
    
    // Initialize from localStorage if available
    this.loadFromStorage();
    
    // Set up daily reset
    this.setupDailyReset();
    
    console.log('Firestore rate limiter: Initialized with Blaze plan thresholds');
  }
  
  /**
   * Load counters from localStorage
   */
  loadFromStorage() {
    try {
      const storedData = localStorage.getItem('firestoreRateLimiter');
      if (storedData) {
        const data = JSON.parse(storedData);
        this.readCount = data.readCount || 0;
        this.writeCount = data.writeCount || 0;
        this.deleteCount = data.deleteCount || 0;
        this.lastResetTime = data.lastResetTime || Date.now();
        this.consecutiveFailures = data.consecutiveFailures || 0;
        this.lastBackoffTime = data.lastBackoffTime || 0;
        
        // Check if we need to reset based on date
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (now - this.lastResetTime > oneDayMs) {
          this.resetCounters();
        }
      }
    } catch (error) {
      console.error('Error loading rate limiter data:', error);
      this.resetCounters();
    }
  }
  
  /**
   * Save counters to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        readCount: this.readCount,
        writeCount: this.writeCount,
        deleteCount: this.deleteCount,
        lastResetTime: this.lastResetTime,
        consecutiveFailures: this.consecutiveFailures,
        lastBackoffTime: this.lastBackoffTime
      };
      localStorage.setItem('firestoreRateLimiter', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving rate limiter data:', error);
    }
  }
  
  /**
   * Reset all counters
   */
  resetCounters() {
    this.readCount = 0;
    this.writeCount = 0;
    this.deleteCount = 0;
    this.lastResetTime = Date.now();
    this.readWarningIssued = false;
    this.writeWarningIssued = false;
    this.deleteWarningIssued = false;
    // Reset backoff on daily reset for Blaze plan
    this.consecutiveFailures = 0;
    this.lastBackoffTime = 0;
    this.saveToStorage();
    console.log('Firestore rate limiter: Counters reset');
  }
  
  /**
   * Set up daily counter reset
   */
  setupDailyReset() {
    // Calculate time until next day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilReset = tomorrow.getTime() - now.getTime();
    
    // Set timeout for reset
    setTimeout(() => {
      this.resetCounters();
      // Set up next day's reset
      this.setupDailyReset();
    }, timeUntilReset);
  }
  
  /**
   * Check if we're in backoff period
   * @returns {boolean} - Whether we're in backoff
   */
  isInBackoff() {
    if (this.consecutiveFailures === 0) return false;
    
    const now = Date.now();
    // Less aggressive backoff for Blaze plan
    const backoffTime = Math.min(15000, Math.pow(1.5, this.consecutiveFailures) * 1000); // Max 15 seconds
    return (now - this.lastBackoffTime) < backoffTime;
  }
  
  /**
   * Record a failure and calculate backoff
   */
  recordFailure() {
    this.consecutiveFailures++;
    this.lastBackoffTime = Date.now();
    this.saveToStorage();
    
    // Less aggressive backoff for Blaze plan
    const backoffTime = Math.min(15000, Math.pow(1.5, this.consecutiveFailures) * 1000);
    console.warn(`Firestore rate limiter: Backing off for ${backoffTime}ms after ${this.consecutiveFailures} consecutive failures`);
  }
  
  /**
   * Record a success and reset failure counter
   */
  recordSuccess() {
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = 0;
      this.saveToStorage();
    }
  }
  
  /**
   * Track a read operation
   * @param {number} count - Number of documents read
   * @returns {boolean} - Whether the operation should proceed
   */
  trackRead(count = 1) {
    // For Blaze plan, we still track but are less restrictive
    
    // Check if we're in backoff period
    if (this.isInBackoff()) {
      console.warn('Firestore rate limiter: In backoff period, using cached data if available');
      // For Blaze plan, we can still allow operations during backoff if needed
      return this.consecutiveFailures < 5; // Only block after multiple consecutive failures
    }
    
    this.readCount += count;
    this.saveToStorage();
    
    // Check if we're approaching the threshold
    const readPercentage = this.readCount / this.dailyReadLimit;
    
    if (readPercentage >= this.criticalThreshold) {
      console.warn(`Firestore rate limiter: Critical read threshold reached (${this.readCount}/${this.dailyReadLimit})`);
      // For Blaze plan, we warn but don't block operations
      if (this.consecutiveFailures > 3) {
        this.recordFailure();
        return false;
      }
    }
    
    if (readPercentage >= this.warningThreshold && !this.readWarningIssued) {
      console.warn(`Firestore rate limiter: Approaching read threshold (${this.readCount}/${this.dailyReadLimit})`);
      this.readWarningIssued = true;
    }
    
    this.recordSuccess();
    return true;
  }
  
  /**
   * Track a write operation
   * @param {number} count - Number of documents written
   * @returns {boolean} - Whether the operation should proceed
   */
  trackWrite(count = 1) {
    // For Blaze plan, we still track but are less restrictive
    
    // Check if we're in backoff period
    if (this.isInBackoff()) {
      console.warn('Firestore rate limiter: In backoff period, deferring write if possible');
      // For Blaze plan, we can still allow operations during backoff if needed
      return this.consecutiveFailures < 5; // Only block after multiple consecutive failures
    }
    
    this.writeCount += count;
    this.saveToStorage();
    
    // Check if we're approaching the threshold
    const writePercentage = this.writeCount / this.dailyWriteLimit;
    
    if (writePercentage >= this.criticalThreshold) {
      console.warn(`Firestore rate limiter: Critical write threshold reached (${this.writeCount}/${this.dailyWriteLimit})`);
      // For Blaze plan, we warn but don't block operations
      if (this.consecutiveFailures > 3) {
        this.recordFailure();
        return false;
      }
    }
    
    if (writePercentage >= this.warningThreshold && !this.writeWarningIssued) {
      console.warn(`Firestore rate limiter: Approaching write threshold (${this.writeCount}/${this.dailyWriteLimit})`);
      this.writeWarningIssued = true;
    }
    
    this.recordSuccess();
    return true;
  }
  
  /**
   * Track a delete operation
   * @param {number} count - Number of documents deleted
   * @returns {boolean} - Whether the operation should proceed
   */
  trackDelete(count = 1) {
    // For Blaze plan, we still track but are less restrictive
    
    // Check if we're in backoff period
    if (this.isInBackoff()) {
      console.warn('Firestore rate limiter: In backoff period, deferring delete if possible');
      // For Blaze plan, we can still allow operations during backoff if needed
      return this.consecutiveFailures < 5; // Only block after multiple consecutive failures
    }
    
    this.deleteCount += count;
    this.saveToStorage();
    
    // Check if we're approaching the threshold
    const deletePercentage = this.deleteCount / this.dailyDeleteLimit;
    
    if (deletePercentage >= this.criticalThreshold) {
      console.warn(`Firestore rate limiter: Critical delete threshold reached (${this.deleteCount}/${this.dailyDeleteLimit})`);
      // For Blaze plan, we warn but don't block operations
      if (this.consecutiveFailures > 3) {
        this.recordFailure();
        return false;
      }
    }
    
    if (deletePercentage >= this.warningThreshold && !this.deleteWarningIssued) {
      console.warn(`Firestore rate limiter: Approaching delete threshold (${this.deleteCount}/${this.dailyDeleteLimit})`);
      this.deleteWarningIssued = true;
    }
    
    this.recordSuccess();
    return true;
  }
  
  /**
   * Get current usage statistics
   * @returns {Object} - Current usage stats
   */
  getStats() {
    return {
      reads: {
        count: this.readCount,
        limit: this.dailyReadLimit,
        percentage: (this.readCount / this.dailyReadLimit * 100).toFixed(2) + '%'
      },
      writes: {
        count: this.writeCount,
        limit: this.dailyWriteLimit,
        percentage: (this.writeCount / this.dailyWriteLimit * 100).toFixed(2) + '%'
      },
      deletes: {
        count: this.deleteCount,
        limit: this.dailyDeleteLimit,
        percentage: (this.deleteCount / this.dailyDeleteLimit * 100).toFixed(2) + '%'
      },
      lastReset: this.lastResetTime,
      inBackoff: this.isInBackoff(),
      backoffLevel: this.consecutiveFailures,
      plan: 'Blaze'
    };
  }
}

// Create a singleton instance
const rateLimiter = new FirestoreRateLimiter();

export default rateLimiter; 