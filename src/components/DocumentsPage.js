// src/components/DocumentsPage.js
import React from "react";
import { Box, Typography } from "@mui/material";

export default function DocumentsPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Documents</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        This is the builder’s documents page. Upload or view docs here.
      </Typography>
    </Box>
  );
}
