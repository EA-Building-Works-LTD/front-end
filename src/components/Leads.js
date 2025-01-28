import React, { useEffect, useState, useRef } from "react";
import {
  Typography,
  Box,
  Avatar,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  CircularProgress,
  Button,
  Drawer,
  useMediaQuery,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Email, Phone, MoreVert, FilterList } from "@mui/icons-material";
import axios from "axios";
import "./Leads.css";

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ builder: "", city: "", budget: "" });
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCards, setExpandedCards] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // For "More Vert" menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  // For dialog to assign builder/status
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editBuilder, setEditBuilder] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const isMobile = useMediaQuery("(max-width:600px)");
  const leadsContainerRef = useRef(null);

  // On mount, fetch leads
  useEffect(() => {
    const fetchGoogleLeads = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const url = `${process.env.REACT_APP_API_URL}/api/google-leads`;
        console.log("GET =>", url);
        const response = await axios.get(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        // Check what came back
        console.log("Raw fetched leads =>", response.data);

        // Guarantee each lead has _id
        const leadsWithId = response.data.map((lead, i) => ({
          ...lead,
          _id: lead._id || `googleSheet-${i}`,
        }));
        console.log("Leads with guaranteed _id =>", leadsWithId);

        setLeads(leadsWithId);
        setFilteredLeads(leadsWithId);
      } catch (err) {
        console.error("Error fetching Google leads:", err);
        setError("Failed to fetch leads");
      } finally {
        setLoading(false);
      }
    };
    fetchGoogleLeads();
  }, []);

  // Reset page if filtered leads are fewer
  useEffect(() => {
    const maxPage = Math.floor(filteredLeads.length / rowsPerPage);
    if (page > maxPage) {
      setPage(0);
    }
  }, [filteredLeads, rowsPerPage, page]);

  // Apply search/filter/sort
  useEffect(() => {
    const applyFilters = () => {
      const filtered = leads.filter((lead) => {
        const matchesSearch =
          !searchQuery ||
          Object.values(lead)
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesBuilder =
          !filters.builder ||
          (lead.builder || "N/A").toLowerCase() === filters.builder.toLowerCase();

        const matchesCity =
          !filters.city ||
          (lead.city || "N/A").toLowerCase() === filters.city.toLowerCase();

        const matchesBudget =
          !filters.budget ||
          (lead.budget || "N/A").toLowerCase() === filters.budget.toLowerCase();

        return matchesSearch && matchesBuilder && matchesCity && matchesBudget;
      });

      const sorted = [...filtered].sort((a, b) =>
        sortOrder === "asc"
          ? new Date(a.timestamp) - new Date(b.timestamp)
          : new Date(b.timestamp) - new Date(a.timestamp)
      );

      setFilteredLeads(sorted);
    };

    applyFilters();
  }, [leads, searchQuery, filters, sortOrder]);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    if (leadsContainerRef.current) {
      leadsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    if (leadsContainerRef.current) {
      leadsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Expand/Collapse details
  const toggleExpand = (field, index) => {
    setExpandedCards((prev) => ({
      ...prev,
      [`${field}-${index}`]: !prev[`${field}-${index}`],
    }));
  };

  const truncateText = (text = "", limit = 50) => {
    return text.length > limit ? text.substring(0, limit) + "..." : text;
  };

  // MoreVert menu
  const handleMenuClick = (event, lead) => {
    console.log("Clicked lead =>", lead);
    setAnchorEl(event.currentTarget);
    setSelectedLead(lead);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Open dialog to edit builder/status
  const handleOpenEditDialog = () => {
    setIsEditDialogOpen(true);
    if (selectedLead) {
      setEditBuilder(selectedLead.builder || "");
      setEditStatus(selectedLead.status || "");
    }
    handleMenuClose();
  };

  // Close dialog
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
  };

  // Save builder/status
  const handleSaveEdit = async () => {
    if (!selectedLead || !selectedLead._id) {
      console.error("No selectedLead or _id is undefined:", selectedLead);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const putUrl = `${process.env.REACT_APP_API_URL}/api/google-leads/${selectedLead._id}`;
      console.log("PUT URL =>", putUrl);

      await axios.put(
        putUrl,
        { builder: editBuilder, status: editStatus },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setLeads((prev) =>
        prev.map((ld) =>
          ld._id === selectedLead._id
            ? { ...ld, builder: editBuilder, status: editStatus }
            : ld
        )
      );
      setFilteredLeads((prev) =>
        prev.map((ld) =>
          ld._id === selectedLead._id
            ? { ...ld, builder: editBuilder, status: editStatus }
            : ld
        )
      );

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error("Error updating lead:", err);
      setError("Error updating lead. Check console/server logs.");
    }
  };

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

  // For the "assign builder" dropdown
  const uniqueBuilders = Array.from(
    new Set(leads.map((lead) => lead.builder || "N/A"))
  );
  // Some sample statuses
  const availableStatuses = ["Pending", "In Progress", "Completed", "Closed"];

  return (
    <Box>
      <Typography variant="h3" className="page-heading">
        EA Building Works LTD Leads
      </Typography>

      {/* Search bar */}
      <Box className="toolbar-section">
        <Box className="search-bar">
          <TextField
            label="Search Leads..."
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
      </Box>

      {/* Filters & Pagination */}
      <Box className="filters-pagination-row">
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={() => setIsFilterOpen(true)}
          className="filter-button"
        >
          Filters
        </Button>
        <TablePagination
          rowsPerPageOptions={!isMobile ? [10, 25, 50] : []}
          component="div"
          count={filteredLeads.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={!isMobile ? "Rows per page:" : ""}
        />
      </Box>

      {/* Filter drawer */}
      <Drawer
        anchor="right"
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      >
        <Box className="filter-drawer">
          <Typography variant="h6" className="filter-title">
            Filter By:
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel>Builder</InputLabel>
            <Select
              value={filters.builder}
              onChange={(e) =>
                setFilters({ ...filters, builder: e.target.value })
              }
            >
              {uniqueBuilders.map((builder, index) => (
                <MenuItem key={`builder-${index}`} value={builder}>
                  {builder}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>City</InputLabel>
            <Select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            >
              {Array.from(
                new Set(leads.map((l) => l.city || "N/A"))
              ).map((city, index) => (
                <MenuItem key={`city-${index}`} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Budget</InputLabel>
            <Select
              value={filters.budget}
              onChange={(e) =>
                setFilters({ ...filters, budget: e.target.value })
              }
            >
              {Array.from(
                new Set(leads.map((l) => l.budget || "N/A"))
              ).map((budget, index) => (
                <MenuItem key={`budget-${index}`} value={budget}>
                  {budget}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Sort Order</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="asc">Oldest First</MenuItem>
              <MenuItem value="desc">Newest First</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsFilterOpen(false)}
            fullWidth
          >
            Apply Filters
          </Button>
        </Box>
      </Drawer>

      {/* Lead cards */}
      <Box ref={leadsContainerRef} className="lead-container">
        {filteredLeads
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((lead, index) => (
            <Box
              className="lead-card"
              key={lead._id || `${index}-${lead.timestamp}`}
            >
              <Box className="lead-card-header">
                <Avatar className="lead-avatar">
                  {lead.fullName?.[0] || "N"}
                </Avatar>
                <Box className="lead-info">
                  <Typography variant="h6" className="lead-name">
                    {lead.fullName || "N/A"}
                  </Typography>
                </Box>
              </Box>

              <Box className="lead-details">
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Builder</Typography>
                  <Typography variant="body2">
                    {lead.builder || "N/A"}
                  </Typography>
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Address</Typography>
                  <Typography variant="body2">
                    {expandedCards[`address-${index}`]
                      ? lead.address || "N/A"
                      : truncateText(lead.address || "N/A", 50)}
                  </Typography>
                  {lead.address && lead.address.length > 50 && (
                    <Button
                      size="small"
                      onClick={() => toggleExpand("address", index)}
                    >
                      {expandedCards[`address-${index}`]
                        ? "Show Less"
                        : "Show More"}
                    </Button>
                  )}
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Work Required</Typography>
                  <Typography variant="body2">
                    {expandedCards[`workRequired-${index}`]
                      ? lead.workRequired || "N/A"
                      : truncateText(lead.workRequired || "N/A", 50)}
                  </Typography>
                  {lead.workRequired && lead.workRequired.length > 50 && (
                    <Button
                      size="small"
                      onClick={() => toggleExpand("workRequired", index)}
                    >
                      {expandedCards[`workRequired-${index}`]
                        ? "Show Less"
                        : "Show More"}
                    </Button>
                  )}
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Extra Details</Typography>
                  <Typography variant="body2">
                    {expandedCards[`details-${index}`]
                      ? lead.details || "N/A"
                      : truncateText(lead.details || "N/A", 50)}
                  </Typography>
                  {lead.details && lead.details.length > 50 && (
                    <Button
                      size="small"
                      onClick={() => toggleExpand("details", index)}
                    >
                      {expandedCards[`details-${index}`]
                        ? "Show Less"
                        : "Show More"}
                    </Button>
                  )}
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Budget</Typography>
                  <Typography variant="body2">
                    {lead.budget || "N/A"}
                  </Typography>
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">City</Typography>
                  <Typography variant="body2">{lead.city || "N/A"}</Typography>
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Status</Typography>
                  <Typography variant="body2">
                    {lead.status || "N/A"}
                  </Typography>
                </Box>
              </Box>

              <Box className="lead-card-footer">
                <Box className="lead-actions">
                  <IconButton
                    component="a"
                    href={`mailto:${lead.email || ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!lead.email}
                  >
                    <Email />
                  </IconButton>
                  <IconButton
                    component="a"
                    href={`tel:${lead.phoneNumber || ""}`}
                    disabled={!lead.phoneNumber}
                  >
                    <Phone />
                  </IconButton>
                  <IconButton onClick={(e) => handleMenuClick(e, lead)}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Button
                  className="copy-details-button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Name: ${lead.fullName}\nAddress: ${lead.address}\nWork Required: ${lead.workRequired}\nExtra Details: ${lead.details}\nBudget: ${lead.budget}\nCity: ${lead.city}`
                    );
                  }}
                >
                  Copy Details
                </Button>
              </Box>
            </Box>
          ))}
      </Box>

      <TablePagination
        rowsPerPageOptions={!isMobile ? [10, 25, 50] : []}
        component="div"
        count={filteredLeads.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage={!isMobile ? "Rows per page:" : ""}
      />

      {/* MoreVert Menu => Assign Builder/Status */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenEditDialog}>
          Assign Builder / Change Status
        </MenuItem>
      </Menu>

      {/* Dialog to edit builder/status */}
      <Dialog
        open={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Update Builder & Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Builder</InputLabel>
            <Select
              value={editBuilder}
              onChange={(e) => setEditBuilder(e.target.value)}
            >
              {uniqueBuilders.map((builder, idx) => (
                <MenuItem key={`builder-list-${idx}`} value={builder}>
                  {builder}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Builder Status</InputLabel>
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              {availableStatuses.map((st) => (
                <MenuItem key={st} value={st}>
                  {st}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Leads;
