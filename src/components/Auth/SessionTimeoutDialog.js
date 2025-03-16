/**
 * Session Timeout Dialog Component
 * 
 * Displays a warning dialog when the user's session is about to expire due to inactivity.
 * Allows the user to continue their session or log out.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  LinearProgress,
  Box,
  Typography
} from '@mui/material';

const SessionTimeoutDialog = ({ 
  open, 
  onContinue, 
  onLogout, 
  warningDuration = 60000, // 1 minute warning by default
  timeoutDuration = 30 * 60 * 1000 // 30 minutes by default
}) => {
  const [timeLeft, setTimeLeft] = useState(warningDuration);
  const [progress, setProgress] = useState(100);
  
  // Format time remaining as MM:SS
  const formatTimeLeft = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Update countdown timer
  useEffect(() => {
    if (!open) {
      setTimeLeft(warningDuration);
      setProgress(100);
      return;
    }
    
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1000;
        
        // Calculate progress percentage
        const newProgress = (newTime / warningDuration) * 100;
        setProgress(Math.max(0, newProgress));
        
        // Auto logout when time reaches 0
        if (newTime <= 0) {
          clearInterval(interval);
          if (typeof onLogout === 'function') {
            onLogout();
          }
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [open, warningDuration, onLogout]);
  
  // Handle continue button click
  const handleContinue = () => {
    if (typeof onContinue === 'function') {
      onContinue();
    }
  };
  
  // Handle logout button click
  const handleLogout = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    }
  };
  
  return (
    <Dialog
      open={open}
      aria-labelledby="session-timeout-dialog-title"
      aria-describedby="session-timeout-dialog-description"
    >
      <DialogTitle id="session-timeout-dialog-title">
        Session Timeout Warning
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="session-timeout-dialog-description">
          Your session is about to expire due to inactivity. You will be automatically logged out in:
        </DialogContentText>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="h4" align="center" color="error">
            {formatTimeLeft(timeLeft)}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          color={progress < 30 ? "error" : progress < 70 ? "warning" : "primary"}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <DialogContentText sx={{ mt: 2 }}>
          For security reasons, sessions automatically timeout after {Math.floor(timeoutDuration / 60000)} minutes of inactivity.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLogout} color="secondary">
          Logout
        </Button>
        <Button onClick={handleContinue} color="primary" variant="contained" autoFocus>
          Continue Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutDialog; 