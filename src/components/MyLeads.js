// src/MyLeads.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
} from "@mui/material";
import {
  Search,
  FilterList,
  ArrowBack,
  ArrowForward,
} from "@mui/icons-material";
import axios from "axios";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { useNavigate } from "react-router-dom";
import "./MyLeads.css";

const MyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For row-click detail drawer (desktop)
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // For search
  const [searchTerm, setSearchTerm] = useState("");

  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

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

  const filteredLeads = leads.filter((lead) => {
    const nameMatch = lead.fullName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const addressMatch = lead.address
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return nameMatch || addressMatch;
  });

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

  // Helper to create a slug from full name
  const slugify = (text) => {
    return (
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with a single dash
        .replace(/[^\w-]+/g, "") // Remove all non-word chars except dash
        .replace(/--+/g, "-") + // Replace multiple dashes with a single dash
      "-lead"
    );
  };

  // On row click: if mobile, navigate using the slug and pass lead data; if desktop, open drawer.
  const handleRowClick = (lead) => {
    if (isMobile) {
      const slug = slugify(lead.fullName || "unknown");
      navigate(`/my-leads/${slug}`, { state: { lead } });
    } else {
      setSelectedLead(lead);
      setDrawerOpen(true);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedLead(null);
  };

  const renderDesktopTable = () => {
    return (
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
                    <Avatar sx={{ bgcolor: "#7D9B76" }} className="lead-avatar">
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
    );
  };

  const renderMobileCards = () => {
    return (
      <Box className="mobile-cards-container">
        {currentLeads.map((lead, i) => (
          <Box
            key={i}
            className="mobile-lead-card"
            onClick={() => handleRowClick(lead)}
          >
            <Box className="card-header">
              <Avatar sx={{ bgcolor: "#7D9B76" }} className="lead-avatar">
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
            <Box className="card-content">
              <Typography variant="body2">
                <strong>Address:</strong> {lead.address || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>City:</strong> {lead.city || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Work Required:</strong> {lead.workRequired || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Details:</strong> {lead.details || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Budget:</strong> {lead.budget || "N/A"}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box className="myLeads-container">
      <Typography variant="h5" className="section-title">
        Zain's Leads
      </Typography>
      <Typography variant="subtitle2" className="section-subtitle">
        View all of your leads.
      </Typography>

      <Box className="tabs-container">
        <div className="tab-item active">
          All Customers <span>{leads.length}</span>
        </div>
        <div className="tab-item">
          Leads <span>40</span>
        </div>
        <div className="tab-item">
          Ongoing <span>20</span>
        </div>
        <div className="tab-item">
          Payment Back <span>25</span>
        </div>
        <div className="tab-item">
          Closed <span>05</span>
        </div>
      </Box>

      <Box className="actions-row">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search"
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

      {isMobile ? renderMobileCards() : renderDesktopTable()}

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

      {/* For desktop, show the drawer */}
      {!isMobile && (
        <LeadDetailDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          lead={selectedLead}
        />
      )}
    </Box>
  );
};

export default MyLeads;
