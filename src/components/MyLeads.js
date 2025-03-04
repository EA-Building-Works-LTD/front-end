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
  Drawer,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Search, FilterList, ArrowBack, ArrowForward } from "@mui/icons-material";
import axios from "axios";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { useNavigate } from "react-router-dom";
import useLocalStorageState from "../hooks/useLocalStorageState";
import "./MyLeads.css";

const MyLeads = () => {
  // API state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For row-click detail drawer (desktop)
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Global search term
  const [searchTerm, setSearchTerm] = useState("");

  // Stage filter tabs – "All Customers" plus the six stage statuses
  const stageTabs = [
    "All Customers",
    "New Lead",
    "In Progress",
    "Quote Sent",
    "Completed",
    "Rejected",
    "Cancelled",
  ];
  const [selectedStage, setSelectedStage] = useState("All Customers");

  // Filters state for each field – using empty string to mean "All"
  const [filters, setFilters] = useState({
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
  });
  // Applied filters state: when user clicks Apply Filters
  const [appliedFilters, setAppliedFilters] = useState({
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
  });

  // State for filter drawer open/close
  const [filterOpen, setFilterOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

  // Retrieve ephemeral state and its setter
  const [allLeadData] = useLocalStorageState("myLeadData", {});

  // Fetch leads on mount
  useEffect(() => {
    const fetchLeads = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/builders/my-leads`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Sort leads by timestamp descending
        const sortedLeads = response.data.slice().sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
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

  // Merge each API lead with ephemeral state so that each lead gets a "stage" property.
  const combinedLeads = leads.map((lead) => ({
    ...lead,
    stage: allLeadData[lead._id]?.stage || "New Lead",
  }));

  // Helper: Get unique values for a given field from combinedLeads.
  const getUniqueValues = (field) => {
    const values = combinedLeads.map((lead) => lead[field]).filter((v) => !!v);
    return Array.from(new Set(values));
  };


  const cityOptions = getUniqueValues("city");
  const budgetOptions = getUniqueValues("budget");

  // Filter leads by global search term.
  let filteredLeads = combinedLeads.filter((lead) => {
    const nameMatch = lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch = lead.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || addressMatch;
  });

  // Apply field-specific filters (from appliedFilters).
  if (appliedFilters.customerName) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.fullName?.toLowerCase() === appliedFilters.customerName.toLowerCase()
    );
  }
  if (appliedFilters.address) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.address?.toLowerCase() === appliedFilters.address.toLowerCase()
    );
  }
  if (appliedFilters.city) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.city?.toLowerCase() === appliedFilters.city.toLowerCase()
    );
  }
  if (appliedFilters.workRequired) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.workRequired?.toLowerCase() === appliedFilters.workRequired.toLowerCase()
    );
  }
  if (appliedFilters.details) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.details?.toLowerCase() === appliedFilters.details.toLowerCase()
    );
  }
  if (appliedFilters.budget) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.budget?.toLowerCase() === appliedFilters.budget.toLowerCase()
    );
  }

  // Then filter by selected stage (unless "All Customers" is chosen).
  const stageFilteredLeads =
    selectedStage === "All Customers"
      ? filteredLeads
      : filteredLeads.filter((lead) => lead.stage === selectedStage);

  // Pagination calculations.
  const totalLeads = stageFilteredLeads.length;
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = stageFilteredLeads.slice(startIndex, endIndex);

  // Reset pagination when filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStage, searchTerm, appliedFilters]);

  // Pagination handlers.
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  // Helper: Create a slug from full name (for mobile navigation).
  const slugify = (text) => {
    return (
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-") + "-lead"
    );
  };

  // On row click: if mobile, navigate using slug; if desktop, open the detail drawer.
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

  // Handler for stage tab click.
  const handleStageTabClick = (stage) => {
    setSelectedStage(stage);
  };

  // --- Filter Drawer Handlers ---
  const applyFilters = () => {
    setAppliedFilters(filters);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      customerName: "",
      address: "",
      city: "",
      workRequired: "",
      details: "",
      budget: "",
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setFilterOpen(false);
  };

  // Render desktop table view.
  const renderDesktopTable = () => (
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

  // Render mobile card view.
  const renderMobileCards = () => (
    <Box className="mobile-cards-container">
      {currentLeads.map((lead, i) => (
        <Box key={i} className="mobile-lead-card" onClick={() => handleRowClick(lead)}>
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

  return (
    <Box className="myLeads-container">
      <Typography variant="h5" className="section-title">
        Zain's Leads
      </Typography>
      <Typography variant="subtitle2" className="section-subtitle">
        View all of your leads.
      </Typography>

      {/* Stage Filter Tabs – horizontal scroll */}
      <Box
        className="tabs-container"
        sx={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          flexWrap: "nowrap",
        }}
      >
        {stageTabs.map((stage) => (
          <div
            key={stage}
            className={`tab-item ${selectedStage === stage ? "active" : ""}`}
            onClick={() => handleStageTabClick(stage)}
            style={{ flexShrink: 0 }}
          >
            {stage}{" "}
            <span>
              {stage === "All Customers"
                ? combinedLeads.length
                : combinedLeads.filter((lead) => lead.stage === stage).length}
            </span>
          </div>
        ))}
      </Box>

      {/* Search & Filter Row */}
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
          <Button variant="outlined" startIcon={<FilterList />} onClick={() => setFilterOpen(true)}>
            Filters
          </Button>
        </div>
      </Box>

      {/* Render leads: Table on desktop, Cards on mobile */}
      {isMobile ? renderMobileCards() : renderDesktopTable()}

      {/* Pagination Controls */}
      <Box className="pagination-controls">
        <IconButton onClick={handlePrev} disabled={currentPage === 1} className="pagination-arrow">
          <ArrowBack />
        </IconButton>
        <Typography className="pagination-info">
          Page {currentPage} of {totalPages || 1}
        </Typography>
        <IconButton onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="pagination-arrow">
          <ArrowForward />
        </IconButton>
      </Box>

      {/* For desktop, show the detail drawer */}
      {!isMobile && (
        <LeadDetailDrawer open={drawerOpen} onClose={handleDrawerClose} lead={selectedLead} />
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        PaperProps={{ sx: { width: "300px" } }}
      >
        <Box className="filter-drawer">
          <Typography variant="h6" className="filter-title">
            Filters
          </Typography>

          {/* City Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-city-label">City</InputLabel>
            <Select
              labelId="filter-city-label"
              value={filters.city}
              label="City"
              onChange={(e) =>
                setFilters({ ...filters, city: e.target.value })
              }
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {cityOptions.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Budget Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-budget-label">Budget</InputLabel>
            <Select
              labelId="filter-budget-label"
              value={filters.budget}
              label="Budget"
              onChange={(e) =>
                setFilters({ ...filters, budget: e.target.value })
              }
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {budgetOptions.map((budget) => (
                <MenuItem key={budget} value={budget}>
                  {budget}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button variant="outlined" className="filter-button" onClick={clearFilters}>
              Clear
            </Button>
            <Button variant="contained" className="filter-button" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default MyLeads;
