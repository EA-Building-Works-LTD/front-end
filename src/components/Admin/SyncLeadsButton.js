import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Typography, Box } from '@mui/material';
import { Sync } from '@mui/icons-material';
import { syncAllLeadsToFirebase } from '../../scripts/syncLeadsToFirebase';
import { useUserRole } from '../Auth/UserRoleContext';

const SyncLeadsButton = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const userRole = useUserRole();
  
  const handleSync = async () => {
    if (userRole !== 'admin') {
      setResult({
        success: false,
        message: 'Only admins can sync leads'
      });
      setSnackbarOpen(true);
      return;
    }
    
    setSyncing(true);
    setResult(null);
    
    try {
      const syncResult = await syncAllLeadsToFirebase();
      setResult(syncResult);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error syncing leads:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
      setSnackbarOpen(true);
    } finally {
      setSyncing(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }
  
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Sync Google Sheets Leads
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This will sync all leads from Google Sheets to Firebase with improved builder matching.
        Use this if builders are not seeing their leads correctly.
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <Sync />}
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? 'Syncing Leads...' : 'Sync All Leads'}
      </Button>
      
      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color={result.success ? 'success.main' : 'error.main'}>
            {result.message}
          </Typography>
          {result.syncedCount !== undefined && (
            <Typography variant="body2">
              Synced: {result.syncedCount}, Skipped: {result.skippedCount || 0}, Errors: {result.errorCount || 0}
            </Typography>
          )}
        </Box>
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={result?.success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {result?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SyncLeadsButton; 