import React from "react";
import { Box, Typography, Container, Divider } from "@mui/material";
import CreateBuilderForm from "./CreateBuilderForm";
import BuildersList from "./BuildersList";

const BuilderManagement = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Builder Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create new builder accounts and manage existing builders.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <CreateBuilderForm />
        
        <BuildersList />
      </Box>
    </Container>
  );
};

export default BuilderManagement; 