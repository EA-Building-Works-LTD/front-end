import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Badge,
  Fab,
  useMediaQuery,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CloseIcon from '@mui/icons-material/Close';
import firestoreDB from '../firebase/firestoreWrapper';
import { useUserRole } from '../components/Auth/UserRoleContext';

/**
 * Component to monitor Firestore usage and display cost information for Blaze plan
 * Optimized to prevent infinite loops and unnecessary renders
 * Only visible to admin users
 */
const FirestoreUsageMonitor = ({ position = 'default' }) => {
  const { isAdmin } = useUserRole();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(0);
  
  // Minimum time between updates in milliseconds (5 minutes)
  const UPDATE_INTERVAL = 5 * 60 * 1000;

  // Memoize the updateStats function to prevent it from changing on each render
  const updateStats = useCallback(() => {
    // Don't update if not admin
    if (!isAdmin) return;
    
    // Throttle updates to prevent excessive calls
    const now = Date.now();
    if (now - lastUpdateRef.current < 10000) { // Minimum 10 seconds between updates
      console.log('FirestoreUsageMonitor: Update throttled');
      return;
    }
    
    lastUpdateRef.current = now;
    
    try {
      const currentStats = firestoreDB.getUsageStats();
      
      // Only update state if stats have changed to prevent render loops
      setStats(prevStats => {
        if (!prevStats) return currentStats;
        
        // Compare important values to see if we need to update
        const hasChanged = 
          prevStats.reads.count !== currentStats.reads.count ||
          prevStats.writes.count !== currentStats.writes.count ||
          prevStats.deletes.count !== currentStats.deletes.count ||
          prevStats.inBackoff !== currentStats.inBackoff;
        
        return hasChanged ? currentStats : prevStats;
      });
      
      // Check if we're approaching thresholds
      if (currentStats) {
        const readPercentage = currentStats.reads.count / currentStats.reads.limit;
        const writePercentage = currentStats.writes.count / currentStats.writes.limit;
        const deletePercentage = currentStats.deletes.count / currentStats.deletes.limit;
        
        // Show dialog if approaching thresholds (80% or more) or in backoff
        if (readPercentage >= 0.8 || writePercentage >= 0.8 || deletePercentage >= 0.8 || currentStats.inBackoff) {
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('FirestoreUsageMonitor: Error updating stats', error);
    }
  }, [isAdmin]);

  // Update stats periodically
  useEffect(() => {
    // Only set up monitoring for admin users
    if (!isAdmin) return;
    
    // Initial update
    updateStats();
    
    // Set up interval for updates - less frequent to reduce overhead
    intervalRef.current = setInterval(updateStats, UPDATE_INTERVAL);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updateStats, isAdmin]);

  // Handle dialog close
  const handleClose = () => {
    setOpen(false);
  };

  // If not admin or no stats yet, show nothing
  if (!isAdmin || !stats) {
    return null;
  }

  // Calculate percentages
  const readPercentage = (stats.reads.count / stats.reads.limit) * 100;
  const writePercentage = (stats.writes.count / stats.writes.limit) * 100;
  const deletePercentage = (stats.deletes.count / stats.deletes.limit) * 100;

  // Determine if any operation is in warning state
  const hasWarning = readPercentage >= 70 || writePercentage >= 70 || deletePercentage >= 70;
  
  // Format the last reset date
  const lastResetDate = typeof stats.lastReset === 'number' 
    ? new Date(stats.lastReset).toLocaleString() 
    : 'Unknown';

  // Estimate costs (very rough estimate)
  const estimatedReadCost = (stats.reads.count / 100000) * 0.06; // $0.06 per 100,000 reads
  const estimatedWriteCost = (stats.writes.count / 100000) * 0.18; // $0.18 per 100,000 writes
  const estimatedDeleteCost = (stats.deletes.count / 100000) * 0.02; // $0.02 per 100,000 deletes
  const totalEstimatedCost = estimatedReadCost + estimatedWriteCost + estimatedDeleteCost;

  // Determine position based on prop and device type
  let positionStyles = {};
  
  if (position === 'admin-panel') {
    // For admin panel, show as a regular component
    positionStyles = {
      position: 'relative',
      bottom: 'auto',
      right: 'auto',
      zIndex: 1,
      width: '100%',
      marginBottom: 2
    };
  } else if (isMobile) {
    // For mobile, position at the top right to avoid bottom navigation
    positionStyles = {
      position: 'fixed',
      top: 70, // Below app bar
      right: 16,
      zIndex: 1000,
      width: minimized ? 'auto' : 250,
    };
  } else {
    // Default position (desktop)
    positionStyles = {
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 1000,
      width: 300,
    };
  }

  // If minimized on mobile, show just a Fab
  if (isMobile && minimized) {
    return (
      <>
        <Tooltip title="Firestore Usage">
          <Fab
            size="small"
            color={hasWarning ? "warning" : "primary"}
            sx={{
              ...positionStyles,
              width: 40,
              height: 40,
            }}
            onClick={() => setMinimized(false)}
          >
            <LocalFireDepartmentIcon />
          </Fab>
        </Tooltip>
        
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                Firestore Usage Details
                <Chip 
                  icon={<LocalFireDepartmentIcon />} 
                  label="Blaze Plan" 
                  color="warning" 
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              {stats.inBackoff && (
                <Chip 
                  icon={<TimerOffIcon />} 
                  label={`In Backoff Mode (Level ${stats.backoffLevel})`} 
                  color="error" 
                  size="small"
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" paragraph>
              <strong>Reads:</strong> {stats.reads.count.toLocaleString()} of {stats.reads.limit.toLocaleString()} ({readPercentage.toFixed(1)}%)
              {readPercentage >= 70 && (
                <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                  Warning: You are approaching your daily read threshold!
                </Typography>
              )}
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Writes:</strong> {stats.writes.count.toLocaleString()} of {stats.writes.limit.toLocaleString()} ({writePercentage.toFixed(1)}%)
              {writePercentage >= 70 && (
                <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                  Warning: You are approaching your daily write threshold!
                </Typography>
              )}
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Deletes:</strong> {stats.deletes.count.toLocaleString()} of {stats.deletes.limit.toLocaleString()} ({deletePercentage.toFixed(1)}%)
              {deletePercentage >= 70 && (
                <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                  Warning: You are approaching your daily delete threshold!
                </Typography>
              )}
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Last Reset:</strong> {lastResetDate}
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Estimated Cost:</strong> ${totalEstimatedCost.toFixed(2)}
            </Typography>
            
            {hasWarning && (
              <Typography variant="body2" color="warning.main" paragraph sx={{ mt: 2, fontWeight: 'bold' }}>
                You are approaching one or more usage thresholds. Consider optimizing your Firestore operations to control costs.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Regular display
  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          ...positionStyles,
          padding: 2, 
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          opacity: 0.9,
          '&:hover': {
            opacity: 1
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mr: 1, fontSize: isMobile ? '0.9rem' : '1.25rem' }}>Firestore Usage</Typography>
            <Tooltip title="Blaze Plan">
              <LocalFireDepartmentIcon color="warning" fontSize="small" />
            </Tooltip>
          </Box>
          {stats.inBackoff && (
            <Chip 
              icon={<TimerOffIcon />} 
              label={`Backoff: Level ${stats.backoffLevel}`} 
              color="error" 
              size="small" 
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={() => setOpen(true)}>
                {hasWarning ? <WarningIcon color="warning" /> : <InfoIcon />}
              </IconButton>
            </Tooltip>
            {isMobile && (
              <Tooltip title="Minimize">
                <IconButton size="small" onClick={() => setMinimized(true)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Reads</Typography>
            <Typography variant="body2">{stats.reads.count.toLocaleString()} / {stats.reads.limit.toLocaleString()}</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={readPercentage} 
            color={readPercentage >= 90 ? "error" : readPercentage >= 70 ? "warning" : "primary"}
            sx={{ mb: 1, height: 8, borderRadius: 1 }}
          />
        </Box>
        
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Writes</Typography>
            <Typography variant="body2">{stats.writes.count.toLocaleString()} / {stats.writes.limit.toLocaleString()}</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={writePercentage} 
            color={writePercentage >= 90 ? "error" : writePercentage >= 70 ? "warning" : "primary"}
            sx={{ mb: 1, height: 8, borderRadius: 1 }}
          />
        </Box>
        
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Deletes</Typography>
            <Typography variant="body2">{stats.deletes.count.toLocaleString()} / {stats.deletes.limit.toLocaleString()}</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={deletePercentage} 
            color={deletePercentage >= 90 ? "error" : deletePercentage >= 70 ? "warning" : "primary"}
            sx={{ mb: 1, height: 8, borderRadius: 1 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption">
            Last reset: {lastResetDate}
          </Typography>
          <Tooltip title="Estimated cost today">
            <Chip 
              label={`$${totalEstimatedCost.toFixed(2)}`} 
              size="small" 
              color={totalEstimatedCost > 1 ? "warning" : "default"}
            />
          </Tooltip>
        </Box>
      </Paper>
      
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              Firestore Usage Details
              <Chip 
                icon={<LocalFireDepartmentIcon />} 
                label="Blaze Plan" 
                color="warning" 
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
            {stats.inBackoff && (
              <Chip 
                icon={<TimerOffIcon />} 
                label={`In Backoff Mode (Level ${stats.backoffLevel})`} 
                color="error" 
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            <strong>Reads:</strong> {stats.reads.count.toLocaleString()} of {stats.reads.limit.toLocaleString()} ({readPercentage.toFixed(1)}%)
            {readPercentage >= 70 && (
              <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                Warning: You are approaching your daily read threshold!
              </Typography>
            )}
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Writes:</strong> {stats.writes.count.toLocaleString()} of {stats.writes.limit.toLocaleString()} ({writePercentage.toFixed(1)}%)
            {writePercentage >= 70 && (
              <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                Warning: You are approaching your daily write threshold!
              </Typography>
            )}
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Deletes:</strong> {stats.deletes.count.toLocaleString()} of {stats.deletes.limit.toLocaleString()} ({deletePercentage.toFixed(1)}%)
            {deletePercentage >= 70 && (
              <Typography color="warning.main" variant="body2" sx={{ mt: 0.5 }}>
                Warning: You are approaching your daily delete threshold!
              </Typography>
            )}
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Last Reset:</strong> {lastResetDate}
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Estimated Cost:</strong> ${totalEstimatedCost.toFixed(2)}
          </Typography>
          
          {hasWarning && (
            <Typography variant="body2" color="warning.main" paragraph sx={{ mt: 2, fontWeight: 'bold' }}>
              You are approaching one or more usage thresholds. Consider optimizing your Firestore operations to control costs.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(FirestoreUsageMonitor); 