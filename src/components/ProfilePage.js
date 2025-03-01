// src/components/ProfilePage.js
import React from "react";
import { Box, Typography } from "@mui/material";

export default function ProfilePage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Profile</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        Builder’s personal info, contact details, etc.
      </Typography>
    </Box>
  );
}
