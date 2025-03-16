import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Collapse,
  IconButton,
  Stack,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BugReportIcon from '@mui/icons-material/BugReport';
import InfoIcon from '@mui/icons-material/Info';
import { cleanupLeadCollections } from '../../scripts/cleanupFirestore';
import { syncAllLeadsToFirebase, syncTestLeadsToFirebase } from '../../scripts/syncLeadsToFirebase';
import { useUserRole } from '../Auth/UserRoleContext';
import { auth } from '../../firebase/config';

const DataManagementTool = () => {
  // Get the user role directly from the context
  const { isAdmin, role } = useUserRole();
  
  // Add debugging to help troubleshoot
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    // Get the current Firebase user
    const user = auth.currentUser;
    setCurrentUser(user);
    
    console.log("DataManagementTool - Current role from context:", role);
    console.log("DataManagementTool - Is admin from context:", isAdmin);
    console.log("DataManagementTool - Current Firebase user:", user?.email);
    console.log("DataManagementTool - Firebase user uid:", user?.uid);
    
    // Check if the user exists in the users collection
    if (user) {
      const checkUserInFirestore = async () => {
        try {
          const { getDoc, doc } = require('firebase/firestore');
          const { db } = require('../../firebase/config');
          
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("DataManagementTool - User data from Firestore:", userData);
            console.log("DataManagementTool - User role from Firestore:", userData.role);
          } else {
            console.log("DataManagementTool - User document does not exist in Firestore");
          }
        } catch (error) {
          console.error("DataManagementTool - Error checking user in Firestore:", error);
        }
      };
      
      checkUserInFirestore();
    }
  }, [isAdmin, role]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [operation, setOperation] = useState(null);
  const [logMessages, setLogMessages] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [testSyncComplete, setTestSyncComplete] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState(null);
  const [forceSync, setForceSync] = useState(false);

  // Only allow admins to access this tool
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Access Denied</AlertTitle>
          <Typography>You must be an admin to access this tool.</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Current role: {role || 'unknown'} (isAdmin: {isAdmin ? 'true' : 'false'})
          </Typography>
          <Typography variant="body2">
            Current user: {currentUser?.email || 'not logged in'}
          </Typography>
          <Typography variant="body2">
            User ID: {currentUser?.uid || 'unknown'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  const addLogMessage = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogMessages(prev => [...prev, { message, timestamp, type }]);
  };

  const handleCleanupCollections = async () => {
    setOperation('cleanup');
    setConfirmDialogOpen(true);
  };

  const handleTestSync = async () => {
    setSyncing(true);
    setTestSyncComplete(false);
    setTestSyncResult(null);
    setSyncResult(null);
    
    try {
      // Add a small delay to ensure UI updates before sync starts
      await new Promise(resolve => setTimeout(resolve, 100));
      
      addLogMessage(`Starting test sync with 10 leads${forceSync ? ' (force sync mode)' : ''}...`, 'info');
      
      const result = await syncTestLeadsToFirebase(10, forceSync);
      setTestSyncResult(result);
      setTestSyncComplete(true);
      
      // If there are errors, automatically expand the error section
      if (result.errors && result.errors.length > 0) {
        setShowErrors(true);
        
        // Check if the error is related to serverTimestamp in arrays
        const hasServerTimestampError = result.errors.some(err => 
          err.error && err.error.includes('serverTimestamp() is not currently supported inside arrays')
        );
        
        if (hasServerTimestampError) {
          addLogMessage(
            'Error: serverTimestamp() is not supported inside arrays. This has been fixed in the code. Please try again.',
            'error'
          );
        }
      }
      
      addLogMessage(`Test sync completed: ${result.syncedCount} leads synced, ${result.skippedCount} skipped, ${result.errorCount} errors`, 
        result.success ? 'success' : 'error');
    } catch (error) {
      setTestSyncResult({
        success: false,
        message: `Error: ${error.message}`,
        syncedCount: 0,
        errorCount: 1,
        errors: [{ lead: 'Unknown', error: error.message }],
        testMode: true
      });
      setTestSyncComplete(true);
      setShowErrors(true);
      addLogMessage(`Test sync failed: ${error.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      // Add a small delay to ensure UI updates before sync starts
      await new Promise(resolve => setTimeout(resolve, 100));
      
      addLogMessage(`Starting full sync of all leads${forceSync ? ' (force sync mode)' : ''}...`, 'info');
      
      const result = await syncAllLeadsToFirebase(forceSync);
      setSyncResult(result);
      
      // If there are errors, automatically expand the error section
      if (result.errors && result.errors.length > 0) {
        setShowErrors(true);
      }
      
      addLogMessage(`Full sync completed: ${result.syncedCount} leads synced, ${result.skippedCount} skipped, ${result.errorCount} errors`, 
        result.success ? 'success' : 'error');
    } catch (error) {
      setSyncResult({
        success: false,
        message: `Error: ${error.message}`,
        syncedCount: 0,
        errorCount: 1,
        errors: [{ lead: 'Unknown', error: error.message }]
      });
      setShowErrors(true);
      addLogMessage(`Full sync failed: ${error.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleErrorDisplay = () => {
    setShowErrors(!showErrors);
  };

  const handleConfirmOperation = async () => {
    setConfirmDialogOpen(false);
    setLoading(true);
    setResult(null);
    setError(null);
    setLogMessages([]);

    try {
      if (operation === 'cleanup') {
        addLogMessage('Starting cleanup of lead collections...', 'info');
        
        // Override console.log to capture messages
        const originalConsoleLog = console.log;
        console.log = (message) => {
          originalConsoleLog(message);
          addLogMessage(message, 'info');
        };
        
        const originalConsoleError = console.error;
        console.error = (message) => {
          originalConsoleError(message);
          addLogMessage(message, 'error');
        };
        
        const cleanupResult = await cleanupLeadCollections();
        
        // Restore console functions
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
        setResult(cleanupResult);
        
        if (cleanupResult.success) {
          addLogMessage(`Successfully deleted ${cleanupResult.leadDataDeleted} documents from leadData and ${cleanupResult.leadsDeleted} documents from leads`, 'success');
        } else {
          addLogMessage(`Failed to complete cleanup: ${cleanupResult.error}`, 'error');
          setError(cleanupResult.error);
        }
      } else if (operation === 'sync') {
        addLogMessage('Starting sync of Google Sheet leads to Firebase...', 'info');
        
        // Override console.log to capture messages
        const originalConsoleLog = console.log;
        console.log = (message) => {
          originalConsoleLog(message);
          addLogMessage(message, 'info');
        };
        
        const originalConsoleError = console.error;
        console.error = (message) => {
          originalConsoleError(message);
          addLogMessage(message, 'error');
        };
        
        const syncResult = await syncAllLeadsToFirebase();
        
        // Restore console functions
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
        setResult(syncResult);
        
        if (syncResult.success) {
          addLogMessage(`Successfully synced ${syncResult.syncedCount} leads from Google Sheets to Firebase`, 'success');
        } else {
          addLogMessage(`Failed to sync leads: ${syncResult.message}`, 'error');
          setError(syncResult.message);
        }
      }
    } catch (err) {
      console.error('Operation failed:', err);
      setError(err.message);
      addLogMessage(`Operation failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Firebase Data Management
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Warning</AlertTitle>
        These operations will permanently modify your Firebase database. Make sure you understand the consequences before proceeding.
      </Alert>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Clean Up Collections
        </Typography>
        <Typography variant="body2" paragraph>
          This will delete all documents in the <strong>leadData</strong> and <strong>leads</strong> collections, 
          keeping only the <strong>users</strong> collection intact.
        </Typography>
        <Button 
          variant="contained" 
          color="error" 
          startIcon={<DeleteIcon />}
          onClick={handleCleanupCollections}
          disabled={loading || syncing}
        >
          Delete Lead Collections
        </Button>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sync Google Sheet Leads
        </Typography>
        <Typography variant="body2" paragraph>
          This will fetch leads from Google Sheets and sync them to the <strong>leads</strong> collection in Firebase.
          It's recommended to test with 10 leads first before syncing all leads.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={forceSync}
                onChange={(e) => setForceSync(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1 }}>Force Sync</Typography>
                <Tooltip title="When enabled, leads will be added even if they already exist in the database">
                  <InfoIcon fontSize="small" color="info" />
                </Tooltip>
              </Box>
            }
          />
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <BugReportIcon />}
            onClick={handleTestSync}
            disabled={syncing}
          >
            {syncing && !testSyncComplete ? <CircularProgress size={20} color="inherit" /> : 'Test Sync (10 Leads)'}
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={syncing && testSyncComplete ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing || !testSyncComplete || (testSyncResult && !testSyncResult.success)}
          >
            {syncing && testSyncComplete ? <CircularProgress size={20} color="inherit" /> : 'Sync All Leads'}
          </Button>
        </Stack>
        
        {testSyncResult && !testSyncResult.success && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Test sync failed. Please fix the issues before attempting to sync all leads.
          </Alert>
        )}
        
        {testSyncResult && testSyncResult.success && !syncResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Test sync successful! You can now proceed to sync all {testSyncResult.totalLeadsAvailable} leads.
          </Alert>
        )}
      </Paper>
      
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography>
            {operation === 'cleanup' ? 'Deleting collections...' : 'Syncing leads...'}
          </Typography>
        </Box>
      )}
      
      {result && (
        <Paper sx={{ p: 3, mb: 3, mt: 3, bgcolor: result.success ? 'success.light' : 'error.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {result.success ? <CheckCircleIcon color="success" sx={{ mr: 1 }} /> : <WarningIcon color="error" sx={{ mr: 1 }} />}
            <Typography variant="h6">
              {result.success ? 'Operation Successful' : 'Operation Failed'}
            </Typography>
          </Box>
          <Typography variant="body1">{result.message}</Typography>
        </Paper>
      )}
      
      {logMessages.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Operation Log
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {logMessages.map((log, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip 
                        label={log.timestamp} 
                        size="small" 
                        sx={{ mr: 1, fontSize: '0.7rem' }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: log.type === 'error' ? 'error.main' : 
                                 log.type === 'success' ? 'success.main' : 
                                 'text.primary'
                        }}
                      >
                        {log.message}
                      </Typography>
                    </Box>
                  } 
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      {testSyncResult && (
        <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Alert severity={testSyncResult.success ? "success" : "error"}>
              <AlertTitle>{testSyncResult.testMode ? "Test Sync Results" : "Sync Results"}</AlertTitle>
              {testSyncResult.message}
            </Alert>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Results:</strong> {testSyncResult.syncedCount} leads synced, 
                {testSyncResult.skippedCount !== undefined ? ` ${testSyncResult.skippedCount} skipped, ` : ' '}
                {testSyncResult.errorCount || 0} errors
                {testSyncResult.totalLeadsAvailable ? ` (${testSyncResult.totalLeadsAvailable} total leads available)` : ''}
              </Typography>
              
              {testSyncResult.errors && testSyncResult.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Button 
                    size="small" 
                    onClick={toggleErrorDisplay}
                    endIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {showErrors ? 'Hide Errors' : 'Show Errors'}
                  </Button>
                  
                  <Collapse in={showErrors}>
                    <List dense sx={{ bgcolor: 'background.paper', mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      {testSyncResult.errors.map((error, index) => (
                        <ListItem key={index} divider={index < testSyncResult.errors.length - 1}>
                          <ListItemText
                            primary={`Lead: ${error.lead || 'Unknown'}`}
                            secondary={`Error: ${error.error || 'Unknown error'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}
      
      {syncResult && (
        <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Alert severity={syncResult.success ? "success" : "error"}>
              <AlertTitle>Full Sync Results</AlertTitle>
              {syncResult.message}
            </Alert>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Results:</strong> {syncResult.syncedCount} leads synced, 
                {syncResult.skippedCount !== undefined ? ` ${syncResult.skippedCount} skipped, ` : ' '}
                {syncResult.errorCount || 0} errors
              </Typography>
              
              {syncResult.errors && syncResult.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Button 
                    size="small" 
                    onClick={toggleErrorDisplay}
                    endIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  >
                    {showErrors ? 'Hide Errors' : 'Show Errors'}
                  </Button>
                  
                  <Collapse in={showErrors}>
                    <List dense sx={{ bgcolor: 'background.paper', mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      {syncResult.errors.map((error, index) => (
                        <ListItem key={index} divider={index < syncResult.errors.length - 1}>
                          <ListItemText
                            primary={`Lead: ${error.lead || 'Unknown'}`}
                            secondary={`Error: ${error.error || 'Unknown error'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          {operation === 'cleanup' ? 'Confirm Collection Deletion' : 'Confirm Lead Sync'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {operation === 'cleanup' 
              ? 'This will permanently delete all documents in the leadData and leads collections. This action cannot be undone. Are you sure you want to proceed?'
              : 'This will sync all leads from Google Sheets to Firebase. Any existing leads in Firebase may be overwritten. Are you sure you want to proceed?'
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmOperation} 
            color={operation === 'cleanup' ? 'error' : 'primary'} 
            variant="contained"
          >
            {operation === 'cleanup' ? 'Delete Collections' : 'Sync Leads'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagementTool; 