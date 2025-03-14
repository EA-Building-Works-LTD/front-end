import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import {
  CloudUpload,
  Check,
  Error,
  Info,
  Storage,
  ArrowForward,
  Sync,
  HelpOutline,
} from "@mui/icons-material";
import { 
  migrateGoogleSheetsToFirebase, 
  checkMigrationNeeded 
} from "../../scripts/migrateToFirebase";
import { syncGoogleFormSubmissions } from "../../firebase/googleFormIntegration";
import { useUserRole } from "../Auth/UserRoleContext";
import axios from "axios";

const MigrationTool = () => {
  const [migrationStatus, setMigrationStatus] = useState({
    checking: false,
    migrating: false,
    needed: false,
    googleSheetsCount: 0,
    firebaseCount: 0,
    message: "",
    success: false,
    error: null,
    migratedCount: 0,
  });

  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    lastSynced: null,
    syncEnabled: false,
    message: "",
    error: null,
  });

  const userRole = useUserRole();
  const isAdmin = userRole === "admin";

  // Check if migration is needed on component mount
  useEffect(() => {
    if (isAdmin) {
      checkMigrationStatus();
      
      // Check if sync is enabled in localStorage
      const syncEnabled = localStorage.getItem("googleFormSyncEnabled") === "true";
      setSyncStatus(prev => ({ ...prev, syncEnabled }));
    }
  }, [isAdmin]);

  // Function to check migration status
  const checkMigrationStatus = async () => {
    setMigrationStatus((prev) => ({ ...prev, checking: true }));
    try {
      const result = await checkMigrationNeeded();
      setMigrationStatus((prev) => ({
        ...prev,
        checking: false,
        needed: result.needed,
        googleSheetsCount: result.googleSheetsCount,
        firebaseCount: result.firebaseCount,
        message: result.message,
      }));
    } catch (error) {
      setMigrationStatus((prev) => ({
        ...prev,
        checking: false,
        error: error.message,
      }));
    }
  };

  // Function to start migration
  const startMigration = async () => {
    setMigrationStatus((prev) => ({ 
      ...prev, 
      migrating: true,
      success: false,
      error: null,
    }));
    
    try {
      const result = await migrateGoogleSheetsToFirebase();
      setMigrationStatus((prev) => ({
        ...prev,
        migrating: false,
        success: result.success,
        message: result.message,
        migratedCount: result.migratedCount,
      }));
      
      // Refresh status after migration
      await checkMigrationStatus();
    } catch (error) {
      setMigrationStatus((prev) => ({
        ...prev,
        migrating: false,
        success: false,
        error: error.message,
      }));
    }
  };

  // Function to sync new Google Form submissions
  const syncGoogleForms = async () => {
    setSyncStatus((prev) => ({ 
      ...prev, 
      syncing: true,
      message: "",
      error: null,
    }));
    
    try {
      // Fetch leads from Google Sheets API
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/google-leads`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const googleLeads = response.data;
      
      // Sync new submissions to Firebase
      const result = await syncGoogleFormSubmissions(googleLeads);
      
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        lastSynced: new Date(),
        message: result.message,
      }));
      
      // Refresh migration status to show updated counts
      await checkMigrationStatus();
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error.message,
      }));
    }
  };

  // Function to toggle automatic sync
  const toggleAutoSync = (event) => {
    const enabled = event.target.checked;
    setSyncStatus(prev => ({ ...prev, syncEnabled: enabled }));
    localStorage.setItem("googleFormSyncEnabled", enabled.toString());
    
    // In a real implementation, you would set up a webhook or Cloud Function
    // to automatically sync new form submissions
  };

  // If not admin, don't show the tool
  if (!isAdmin) {
    return (
      <Alert severity="warning">
        <AlertTitle>Access Denied</AlertTitle>
        You need administrator privileges to access the migration tool.
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Data Migration Tool
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This tool helps you migrate lead data from Google Forms to Firebase Firestore.
        Migration is a one-time process that will copy all your existing leads to the new database.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Status Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Migration Status
        </Typography>

        {migrationStatus.checking ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>Checking migration status...</Typography>
          </Box>
        ) : (
          <>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Storage color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Google Forms Leads" 
                  secondary={migrationStatus.googleSheetsCount} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Storage color="secondary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Firebase Leads" 
                  secondary={migrationStatus.firebaseCount} 
                />
              </ListItem>
            </List>

            {migrationStatus.error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {migrationStatus.error}
              </Alert>
            ) : migrationStatus.needed ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Migration Needed</AlertTitle>
                {migrationStatus.message}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle>Migration Status</AlertTitle>
                {migrationStatus.message}
              </Alert>
            )}
          </>
        )}
      </Box>

      {/* Migration Results */}
      {migrationStatus.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Migration Successful</AlertTitle>
          {migrationStatus.message}
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button 
          variant="outlined" 
          onClick={checkMigrationStatus}
          disabled={migrationStatus.checking || migrationStatus.migrating}
          startIcon={<Info />}
        >
          Refresh Status
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={startMigration}
          disabled={migrationStatus.migrating || (!migrationStatus.needed && migrationStatus.googleSheetsCount > 0)}
          startIcon={migrationStatus.migrating ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
        >
          {migrationStatus.migrating ? "Migrating..." : "Start Migration"}
        </Button>
      </Box>

      {/* Migration Process Visualization */}
      {(migrationStatus.needed || migrationStatus.migrating) && (
        <Box sx={{ mt: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <Box sx={{ textAlign: "center" }}>
            <Storage sx={{ fontSize: 40, color: "primary.main" }} />
            <Typography variant="body2">Google Forms</Typography>
            <Typography variant="body2" color="text.secondary">
              {migrationStatus.googleSheetsCount} leads
            </Typography>
          </Box>
          
          <ArrowForward sx={{ fontSize: 30, color: migrationStatus.migrating ? "secondary.main" : "text.disabled" }} />
          
          <Box sx={{ textAlign: "center" }}>
            <Storage sx={{ fontSize: 40, color: "secondary.main" }} />
            <Typography variant="body2">Firebase</Typography>
            <Typography variant="body2" color="text.secondary">
              {migrationStatus.firebaseCount} leads
            </Typography>
          </Box>
        </Box>
      )}

      {/* Google Form Sync Section */}
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          Google Form Sync
          <Tooltip title="This feature allows you to sync new Google Form submissions to Firebase automatically">
            <HelpOutline sx={{ ml: 1, fontSize: 18, color: 'text.secondary' }} />
          </Tooltip>
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          After migration, new form submissions will still go to Google Sheets. 
          Use this feature to sync new submissions to Firebase.
        </Typography>
        
        {syncStatus.error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            <AlertTitle>Sync Error</AlertTitle>
            {syncStatus.error}
          </Alert>
        )}
        
        {syncStatus.message && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            <AlertTitle>Sync Status</AlertTitle>
            {syncStatus.message}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={syncStatus.syncEnabled}
                onChange={toggleAutoSync}
                color="primary"
              />
            }
            label="Enable automatic sync"
          />
          
          <Button
            variant="outlined"
            color="primary"
            onClick={syncGoogleForms}
            disabled={syncStatus.syncing}
            startIcon={syncStatus.syncing ? <CircularProgress size={20} color="inherit" /> : <Sync />}
          >
            {syncStatus.syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </Box>
        
        {syncStatus.lastSynced && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last synced: {syncStatus.lastSynced.toLocaleString()}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default MigrationTool; 