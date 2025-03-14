import React from "react";
import {
  Box,
  Typography,
  Container,
  Breadcrumbs,
  Link,
  Paper,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import MigrationTool from "./MigrationTool";
import { useUserRole } from "../Auth/UserRoleContext";

const DataMigration = () => {
  const userRole = useUserRole();
  const isAdmin = userRole === "admin";

  // Debug information
  console.log("Current user role:", userRole);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Debug information visible to the user */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: "#f5f5f5" }}>
        <Typography variant="body2">
          Debug Info - Current Role: <strong>{userRole || "none"}</strong> | 
          Is Admin: <strong>{isAdmin ? "Yes" : "No"}</strong>
        </Typography>
      </Paper>

      {!isAdmin && (
        <Typography variant="h4" color="error">
          Access Denied
        </Typography>
      )}
      
      {!isAdmin && (
        <Typography variant="body1">
          You need administrator privileges to access this page.
        </Typography>
      )}

      {isAdmin && (
        <>
          {/* Breadcrumbs */}
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
            <Link component={RouterLink} to="/dashboard" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Data Migration</Typography>
          </Breadcrumbs>

          {/* Page Title */}
          <Typography variant="h4" gutterBottom>
            Data Migration
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Migrate your lead data from Google Sheets to Firebase Firestore for improved performance and reliability.
          </Typography>

          {/* Migration Tool */}
          <MigrationTool />

          {/* Additional Information */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Why Migrate to Firebase?
            </Typography>
            <Typography variant="body1" paragraph>
              Firebase Firestore offers several advantages over Google Sheets:
            </Typography>
            <ul>
              <li>
                <Typography variant="body1">
                  <strong>Better Performance:</strong> Faster data retrieval and updates
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Real-time Updates:</strong> Changes are immediately reflected across all devices
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Advanced Querying:</strong> More powerful filtering and sorting capabilities
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Improved Security:</strong> Better access control and data protection
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  <strong>Offline Support:</strong> Users can access data even when offline
                </Typography>
              </li>
            </ul>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Migration Process
            </Typography>
            <Typography variant="body1" paragraph>
              The migration process is simple:
            </Typography>
            <ol>
              <li>
                <Typography variant="body1">
                  Click the "Start Migration" button above
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Wait for the migration to complete (this may take a few minutes depending on the amount of data)
                </Typography>
              </li>
              <li>
                <Typography variant="body1">
                  Once complete, your application will automatically use Firebase for all lead data
                </Typography>
              </li>
            </ol>
            <Typography variant="body1" sx={{ mt: 2 }}>
              <strong>Note:</strong> Your Google Sheets data will remain untouched. This process only copies the data to Firebase.
            </Typography>
          </Box>
        </>
      )}
    </Container>
  );
};

export default DataMigration; 