import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import SyncLeadsButton from "./SyncLeadsButton";
import DataManagementTool from "./DataManagementTool";
import FirestoreUsageMonitor from "../FirestoreUsageMonitor";

const AdminTools = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Tools
      </Typography>
      
      {/* Firestore Usage Monitor */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Firestore Usage
        </Typography>
        <FirestoreUsageMonitor position="admin-panel" />
      </Paper>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Quick Actions" />
          <Tab label="Data Management" />
        </Tabs>
      </Paper>
      
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SyncLeadsButton />
          </Grid>
        </Grid>
      )}
      
      {activeTab === 1 && (
        <DataManagementTool />
      )}
    </Box>
  );
};

export default AdminTools; 