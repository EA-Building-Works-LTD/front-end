import React from "react";
import {
  Box,
  Typography,
  Grid,
} from "@mui/material";
import SyncLeadsButton from "./SyncLeadsButton";

const AdminTools = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Tools
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SyncLeadsButton />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminTools; 