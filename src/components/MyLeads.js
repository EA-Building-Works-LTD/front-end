// src/MyLeads.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from "@mui/material";
import axios from "axios";

const MyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/builders/my-leads`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setLeads(response.data);
      } catch (err) {
        console.error("Error fetching leads:", err);
        setError("Failed to fetch leads. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" textAlign="center" my={4}>
        My Leads
      </Typography>
      <List>
        {leads.map((lead, index) => (
          <React.Fragment key={index}>
            <ListItem>
              <ListItemText
                primary={lead.fullName}
                secondary={`Address: ${lead.address} | Work: ${lead.workRequired} | Budget: ${lead.budget}`}
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default MyLeads;
