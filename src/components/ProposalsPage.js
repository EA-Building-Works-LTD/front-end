// src/components/ProposalsPage.js
import React from "react";
import { Box, Typography } from "@mui/material";

export default function ProposalsPage() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Proposals</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        This is the builder’s proposals page. List or manage proposals here.
      </Typography>
    </Box>
  );
}
