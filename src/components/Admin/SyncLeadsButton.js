import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Typography, Box, Stack } from '@mui/material';
import { Sync, BugReport } from '@mui/icons-material';
import { syncAllLeadsToFirebase, syncTestLeadsToFirebase } from '../../scripts/syncLeadsToFirebase';
import { useUserRole } from '../Auth/UserRoleContext';

const SyncLeadsButton = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { role, isAdmin } = useUserRole();
  const [testSyncComplete, setTestSyncComplete] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState(null);
  
  // Add debugging
  console.log("SyncLeadsButton - User role:", role);
  console.log("SyncLeadsButton - Is admin:", isAdmin);
  
  const handleTestSync = async () => {
    if (!isAdmin) {
      setResult({
        success: false,
        message: 'Only admins can sync leads'
      });
      setSnackbarOpen(true);
      return;
    }
    
    setSyncing(true);
    setResult(null);
    setTestSyncResult(null);
    setTestSyncComplete(false);
    
    try {
      const syncResult = await syncTestLeadsToFirebase(10);
      setTestSyncResult(syncResult);
      setTestSyncComplete(true);
      
      // Check if the error is related to serverTimestamp in arrays
      if (syncResult.errors && syncResult.errors.length > 0) {
        const hasServerTimestampError = syncResult.errors.some(err => 
          err.error && err.error.includes('serverTimestamp() is not currently supported inside arrays')
        );
        
        if (hasServerTimestampError) {
          setResult({
            ...syncResult,
            message: 'Error: serverTimestamp() is not supported inside arrays. This has been fixed in the code. Please try again.'
          });
        } else {
          setResult(syncResult);
        }
      } else {
        setResult(syncResult);
      }
      
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error syncing test leads:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        testMode: true
      });
      setTestSyncResult({
        success: false,
        message: `Error: ${error.message}`,
        testMode: true
      });
      setTestSyncComplete(true);
      setSnackbarOpen(true);
    } finally {
      setSyncing(false);
    }
  };
  
  const handleSync = async () => {
    if (!isAdmin) {
      setResult({
        success: false,
        message: 'Only admins can sync leads'
      });
      setSnackbarOpen(true);
      return;
    }
    
    // Don't allow full sync if test sync failed
    if (testSyncResult && !testSyncResult.success) {
      setResult({
        success: false,
        message: 'Test sync failed. Please fix the issues before attempting to sync all leads.'
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
  if (!isAdmin) {
    return null;
  }
  
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Sync Google Sheets Leads
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This will sync leads from Google Sheets to Firebase with improved builder matching.
        It's recommended to test with 10 leads first before syncing all leads.
      </Typography>
      
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={syncing && !testSyncComplete ? <CircularProgress size={20} color="inherit" /> : <BugReport />}
          onClick={handleTestSync}
          disabled={syncing}
        >
          {syncing && !testSyncComplete ? 'Testing...' : 'Test Sync (10 Leads)'}
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={syncing && testSyncComplete ? <CircularProgress size={20} color="inherit" /> : <Sync />}
          onClick={handleSync}
          disabled={syncing || !testSyncComplete || (testSyncResult && !testSyncResult.success)}
        >
          {syncing && testSyncComplete ? 'Syncing...' : 'Sync All Leads'}
        </Button>
      </Stack>
      
      {testSyncResult && !testSyncResult.success && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Test sync failed. Please fix the issues before attempting to sync all leads.
        </Alert>
      )}
      
      {testSyncResult && testSyncResult.success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Test sync successful! You can now proceed to sync all 
          {testSyncResult.totalLeadsAvailable ? ` ${testSyncResult.totalLeadsAvailable}` : ''} leads.
        </Alert>
      )}
      
      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color={result.success ? 'success.main' : 'error.main'}>
            {result.message}
          </Typography>
          {result.syncedCount !== undefined && (
            <Typography variant="body2">
              Synced: {result.syncedCount}, Skipped: {result.skippedCount || 0}, Errors: {result.errorCount || 0}
              {result.testMode ? ' (Test Mode)' : ''}
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