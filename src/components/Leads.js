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

  const isMobile = useMediaQuery("(max-width:600px)");
  const leadsContainerRef = useRef(null); // Ref to the leads container

  useEffect(() => {
    const fetchGoogleLeads = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/google-leads`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setLeads(response.data || []);
        setFilteredLeads(response.data || []);
      } catch (error) {
        setError(
          error.response?.status === 403
            ? "Access forbidden. Please check your permissions."
            : `Failed to fetch leads. Status: ${
                error.response ? error.response.status : error.message
              }`
        );
      } finally {
        setLoading(false);
      }
    };
    fetchGoogleLeads();
  }, []);

  useEffect(() => {
    const maxPage = Math.floor(filteredLeads.length / rowsPerPage);
    if (page > maxPage) {
      setPage(0);
    }
  }, [filteredLeads, rowsPerPage, page]);

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
          (lead.builder || "N/A").toLowerCase() ===
            filters.builder.toLowerCase();

        const matchesCity =
          !filters.city ||
          (lead.city || "N/A").toLowerCase() === filters.city.toLowerCase();

        const matchesBudget =
          !filters.budget ||
          (lead.budget || "N/A").toLowerCase() === filters.budget.toLowerCase();

        return matchesSearch && matchesBuilder && matchesCity && matchesBudget;
      });

      const sortedFiltered = [...filtered].sort((a, b) =>
        sortOrder === "asc"
          ? new Date(a.timestamp) - new Date(b.timestamp)
          : new Date(b.timestamp) - new Date(a.timestamp)
      );

      setFilteredLeads(sortedFiltered);
    };

    applyFilters();
  }, [leads, searchQuery, filters, sortOrder]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);

    // Scroll to the top of the leads container when page changes
    if (leadsContainerRef.current) {
      leadsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);

    // Scroll to the top of the leads container when rows per page changes
    if (leadsContainerRef.current) {
      leadsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleExpand = (field, index) => {
    setExpandedCards((prev) => ({
      ...prev,
      [`${field}-${index}`]: !prev[`${field}-${index}`], // Toggle the expanded state for the specific field
    }));
  };

  const truncateText = (text, limit) => {
    if (text.length > limit) {
      return text.substring(0, limit) + "...";
    }
    return text;
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

  return (
    <Box>
      <Typography variant="h3" className="page-heading">
        EA Building Works LTD Leads
      </Typography>

      {/* Toolbar with Search and Filters */}
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

      {/* Filter Button and Pagination */}
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

      {/* Filter Drawer */}
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
              {Array.from(
                new Set(leads.map((lead) => lead.builder || "N/A"))
              ).map((builder, index) => (
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
              {Array.from(new Set(leads.map((lead) => lead.city || "N/A"))).map(
                (city, index) => (
                  <MenuItem key={`city-${index}`} value={city}>
                    {city}
                  </MenuItem>
                )
              )}
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
                new Set(leads.map((lead) => lead.budget || "N/A"))
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

      {/* Cards for Leads */}
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
                  <IconButton>
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
    </Box>
  );
};

export default Leads;
