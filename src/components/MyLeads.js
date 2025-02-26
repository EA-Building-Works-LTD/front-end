// src/MyLeads.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
} from "@mui/material";
import { Search, FilterList, ArrowBack, ArrowForward } from "@mui/icons-material";
import axios from "axios";
import "./MyLeads.css";

// Import our new side drawer
import LeadDetailDrawer from "./LeadDetailDrawer";

const MyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For row-click detail drawer
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // For search
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/builders/my-leads`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Sort leads by timestamp descending
        const sortedLeads = response.data.slice().sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setLeads(sortedLeads);
      } catch (err) {
        console.error("Error fetching leads:", err);
        setError("Failed to fetch leads. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  // Loading / error states
  if (loading) {
    return (
      <Box className="myLeads-loading-container">
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box className="myLeads-error-container">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Filter by search
  const filteredLeads = leads.filter((lead) => {
    const nameMatch = lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch = lead.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || addressMatch;
  });

  // Pagination logic
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  // Row click => show drawer
  const handleRowClick = (lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedLead(null);
  };

  return (
    <Box className="myLeads-container">
      {/* Top Section */}
      <Typography variant="h5" className="section-title">
        Zain's Leads 
      </Typography>
      <Typography variant="subtitle2" className="section-subtitle">
        View all of your leads.
      </Typography>

      {/* Tabs */}
      <Box className="tabs-container">
        <div className="tab-item active">
          All Customers <span>{leads.length}</span>
        </div>
        <div className="tab-item">Leads <span>40</span></div>
        <div className="tab-item">Ongoing <span>20</span></div>
        <div className="tab-item">Payment Back <span>25</span></div>
        <div className="tab-item">Closed <span>05</span></div>
      </Box>

      {/* Search & Filter */}
      <Box className="actions-row">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search for Clients"
          InputProps={{
            startAdornment: <Search className="search-icon" />,
          }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-field"
        />
        <div className="action-buttons">
          <Button variant="outlined" startIcon={<FilterList />}>
            Filters
          </Button>
        </div>
      </Box>

      {/* Leads Table */}
      <TableContainer component={Paper} className="leads-table-container">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="table-header">Customer Name</TableCell>
              <TableCell className="table-header">Address</TableCell>
              <TableCell className="table-header">City</TableCell>
              <TableCell className="table-header">Work Required</TableCell>
              <TableCell className="table-header">Details</TableCell>
              <TableCell className="table-header">Budget</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentLeads.map((lead, i) => (
              <TableRow
                key={i}
                onClick={() => handleRowClick(lead)}
                hover
                style={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Box className="client-cell">
                    <Avatar sx={{bgcolor: "#7D9B76"}} className="lead-avatar">
                      {lead.fullName?.[0] || "N"}
                    </Avatar>
                    <Box>
                      <Typography className="client-name">
                        {lead.fullName || "Unknown Name"}
                      </Typography>
                      <Typography className="client-subtext">
                        {lead.phoneNumber}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{lead.address || "N/A"}</TableCell>
                <TableCell>{lead.city || "N/A"}</TableCell>
                <TableCell>{lead.workRequired || "N/A"}</TableCell>
                <TableCell>{lead.details || "N/A"}</TableCell>
                <TableCell>{lead.budget || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box className="pagination-controls">
        <IconButton
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="pagination-arrow"
        >
          <ArrowBack />
        </IconButton>
        <Typography className="pagination-info">
          Page {currentPage} of {totalPages || 1}
        </Typography>
        <IconButton
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="pagination-arrow"
        >
          <ArrowForward />
        </IconButton>
      </Box>

      {/* Our new LeadDetailDrawer, opens on row click */}
      <LeadDetailDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        lead={selectedLead}
      />
    </Box>
  );
};

export default MyLeads;
