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
  Chip,
  FormHelperText,
} from "@mui/material";
import { 
  Search, 
  FilterList, 
  ArrowBack, 
  ArrowForward, 
  FolderOpen,
  Assignment,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Send,
  SortByAlpha,
  CalendarToday,
} from "@mui/icons-material";
import axios from "axios";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { useNavigate } from "react-router-dom";
import useLocalStorageState from "../../hooks/useLocalStorageState";
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

  // Date filter options
  const dateFilterOptions = [
    { value: "", label: "All Time" },
    { value: "7days", label: "Last 7 Days" },
    { value: "14days", label: "Last 14 Days" },
    { value: "21days", label: "Last 21 Days" },
    { value: "1month", label: "Last Month" },
    { value: "3months", label: "Last 3 Months" },
    { value: "6months", label: "Last 6 Months" },
    { value: "1year", label: "Last Year" },
    { value: "1yearplus", label: "Older than 1 Year" },
  ];

  // Filters state for each field – using empty string to mean "All"
  const [filters, setFilters] = useState({
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
    dateAdded: "", // New date filter
  });
  // Applied filters state: when user clicks Apply Filters
  const [appliedFilters, setAppliedFilters] = useState({
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
    dateAdded: "", // New date filter
  });

  // State for filter drawer open/close
  const [filterOpen, setFilterOpen] = useState(false);

  // State for view mode (grouped or list)
  const [viewMode, setViewMode] = useState("list");

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

  // Helper function to check if a lead is within the specified time range
  const isLeadWithinTimeRange = (lead, days) => {
    const leadDate = new Date(lead.timestamp);
    const now = new Date();
    const timeAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return leadDate >= timeAgo;
  };

  // Merge each API lead with ephemeral state so that each lead gets a "stage" property.
  // Note: This array contains ALL leads regardless of stage or age.
  // The filtering by stage happens later when the user clicks on a stage tab.
  const combinedLeads = leads.map((lead) => {
    // Check if lead is within the last 14 days
    const isWithin14Days = isLeadWithinTimeRange(lead, 14);
    
    // Get the stored stage from local storage (if any)
    const storedStage = allLeadData[lead._id]?.stage;
    const stageManuallySet = allLeadData[lead._id]?.stageManuallySet;
    
    let stage;
    
    // If the lead has a manually set stage, respect that
    if (stageManuallySet) {
      stage = storedStage || "New Lead";
    } 
    // If it has a stored stage but not manually set, use that
    else if (storedStage) {
      stage = storedStage;
    }
    // Default for leads with no stored stage
    else {
      stage = "New Lead";
    }
    
    return {
      ...lead,
      stage,
    };
  });

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
  
  // Apply date filter
  if (appliedFilters.dateAdded) {
    const now = new Date();
    let filterDate;
    
    switch (appliedFilters.dateAdded) {
      case "7days":
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "14days":
        filterDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "21days":
        filterDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1month":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "3months":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "6months":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1year":
        filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1yearplus":
        filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) < filterDate);
        break;
      default:
        break;
    }
  }

  // Then filter by selected stage (unless "All Customers" is chosen).
  // This is where we filter the leads based on the selected stage tab.
  // "All Customers" shows all leads regardless of stage.
  // Other tabs (like "New Lead") only show leads with that specific stage.
  const stageFilteredLeads =
    selectedStage === "All Customers"
      ? filteredLeads
      : filteredLeads.filter((lead) => lead.stage === selectedStage);

  // Group leads by stage for the grouped view
  const groupedLeads = stageTabs.slice(1).reduce((acc, stage) => {
    const leadsInStage = filteredLeads.filter(lead => lead.stage === stage);
    if (leadsInStage.length > 0) {
      acc[stage] = leadsInStage;
    }
    return acc;
  }, {});

  // Pagination calculations.
  const totalLeads = stageFilteredLeads.length;
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = stageFilteredLeads.slice(startIndex, endIndex);

  // Reset pagination when filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStage, searchTerm, appliedFilters, viewMode]);

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
      dateAdded: "", // Clear date filter too
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setFilterOpen(false);
  };

  // Helper: Get stage icon based on stage name
  const getStageIcon = (stage) => {
    switch (stage) {
      case "New Lead":
        return <FolderOpen fontSize="small" sx={{ color: "#4DB6AC" }} />;
      case "In Progress":
        return <HourglassEmpty fontSize="small" sx={{ color: "#F4A261" }} />;
      case "Quote Sent":
        return <Send fontSize="small" sx={{ color: "#457B9D" }} />;
      case "Completed":
        return <CheckCircle fontSize="small" sx={{ color: "#52B788" }} />;
      case "Rejected":
        return <Cancel fontSize="small" sx={{ color: "#E63946" }} />;
      case "Cancelled":
        return <Cancel fontSize="small" sx={{ color: "#E63946" }} />;
      default:
        return <Assignment fontSize="small" />;
    }
  };

  // Helper: Get stage class name for styling
  const getStageClass = (stage) => {
    const stageKey = stage.toLowerCase().replace(/\s+/g, '-');
    switch (stageKey) {
      case 'new-lead':
        return 'stage-new-lead';
      case 'in-progress':
        return 'stage-in-progress';
      case 'quote-sent':
        return 'stage-quote-sent';
      case 'completed':
        return 'stage-completed';
      case 'rejected':
      case 'cancelled':
      case 'no-answer':
        return `stage-${stageKey}`;
      default:
        return '';
    }
  };

  // Helper: Get stage indicator class
  const getStageIndicatorClass = (stage) => {
    const stageKey = stage.toLowerCase().replace(/\s+/g, '-');
    switch (stageKey) {
      case 'new-lead':
        return 'stage-new';
      case 'in-progress':
        return 'stage-progress';
      case 'quote-sent':
        return 'stage-quote';
      case 'completed':
        return 'stage-completed';
      case 'rejected':
      case 'cancelled':
      case 'no-answer':
        return 'stage-rejected';
      default:
        return '';
    }
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
            <TableCell className="table-header">Stage</TableCell>
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
                  <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
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
              <TableCell>
                <Chip 
                  icon={getStageIcon(lead.stage)}
                  label={lead.stage} 
                  size="small"
                  sx={{ 
                    backgroundColor: lead.stage === "New Lead" ? "#E8F5E9" :
                                    lead.stage === "In Progress" ? "#FFF3E0" :
                                    lead.stage === "Quote Sent" ? "#E1F5FE" :
                                    lead.stage === "Completed" ? "#E8F5E9" :
                                    "#FFEBEE",
                    color: lead.stage === "New Lead" ? "#2E7D32" :
                           lead.stage === "In Progress" ? "#E65100" :
                           lead.stage === "Quote Sent" ? "#0277BD" :
                           lead.stage === "Completed" ? "#2E7D32" :
                           "#C62828",
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: 'inherit'
                    }
                  }}
                />
              </TableCell>
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
        <Box 
          key={i} 
          className={`mobile-lead-card ${getStageClass(lead.stage)}`} 
          onClick={() => handleRowClick(lead)}
        >
          <Box className="card-header">
            <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
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
              <strong>Budget:</strong> {lead.budget || "N/A"}
            </Typography>
            <div className={`card-stage-badge ${getStageClass(lead.stage)}`}>
              {getStageIcon(lead.stage)}
              <span style={{ marginLeft: '4px' }}>{lead.stage}</span>
            </div>
          </Box>
        </Box>
      ))}
    </Box>
  );

  // Render grouped view (desktop and mobile)
  const renderGroupedView = () => (
    <>
      {Object.keys(groupedLeads).length === 0 ? (
        <Box className="empty-state">
          <FolderOpen className="empty-state-icon" />
          <Typography className="empty-state-title">No leads found</Typography>
          <Typography className="empty-state-text">
            There are no leads matching your current filters. Try adjusting your search criteria.
          </Typography>
        </Box>
      ) : (
        Object.entries(groupedLeads).map(([stage, stageLeads]) => (
          <Box key={stage}>
            <Box className="stage-group-header">
              <span className={`stage-indicator ${getStageIndicatorClass(stage)}`}></span>
              {stage}
              <span className="stage-group-count">{stageLeads.length}</span>
            </Box>
            
            {isMobile ? (
              <Box className="mobile-cards-container">
                {stageLeads.map((lead, i) => (
                  <Box 
                    key={i} 
                    className={`mobile-lead-card ${getStageClass(lead.stage)}`} 
                    onClick={() => handleRowClick(lead)}
                  >
                    <Box className="card-header">
                      <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
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
                        <strong>Budget:</strong> {lead.budget || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
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
                    {stageLeads.map((lead, i) => (
                      <TableRow
                        key={i}
                        onClick={() => handleRowClick(lead)}
                        hover
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Box className="client-cell">
                            <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
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
            )}
          </Box>
        ))
      )}
    </>
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
            {stage !== "All Customers" && (
              <span className={`stage-indicator ${getStageIndicatorClass(stage)}`}></span>
            )}
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
          <Button 
            variant="outlined" 
            startIcon={<SortByAlpha />} 
            onClick={() => setViewMode(viewMode === "list" ? "grouped" : "list")}
          >
            {viewMode === "list" ? "Group by Stage" : "List View"}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<FilterList />} 
            onClick={() => setFilterOpen(true)}
          >
            Filters
          </Button>
        </div>
      </Box>

      {/* Active Filter Heading */}
      {appliedFilters.dateAdded && (
        <Box className="active-filter-heading">
          <CalendarToday fontSize="small" sx={{ color: '#2A9D8F', mr: 1 }} />
          <Typography variant="h6">
            {dateFilterOptions.find(option => option.value === appliedFilters.dateAdded)?.label || 'Filtered Leads'}
            <span className="filter-count">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            size="small" 
            onClick={() => {
              setFilters({...filters, dateAdded: ''});
              setAppliedFilters({...appliedFilters, dateAdded: ''});
            }}
            startIcon={<Cancel fontSize="small" />}
            className="clear-filter-button"
          >
            Clear Filter
          </Button>
        </Box>
      )}

      {/* Render leads based on view mode */}
      {viewMode === "grouped" ? (
        renderGroupedView()
      ) : (
        isMobile ? renderMobileCards() : renderDesktopTable()
      )}

      {/* Pagination Controls - only show in list view */}
      {viewMode === "list" && (
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
      )}

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

          {/* Date Added Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-date-label">Date Added</InputLabel>
            <Select
              labelId="filter-date-label"
              value={filters.dateAdded}
              label="Date Added"
              onChange={(e) =>
                setFilters({ ...filters, dateAdded: e.target.value })
              }
              startAdornment={
                <CalendarToday fontSize="small" sx={{ mr: 1, color: '#2A9D8F' }} />
              }
            >
              {dateFilterOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Filter leads by when they were added
            </FormHelperText>
          </FormControl>

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
            <Button variant="outlined" className="filter-button outlined" onClick={clearFilters}>
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
