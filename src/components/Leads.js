import React, { useEffect, useState } from "react";
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
  Toolbar,
  TablePagination,
  CircularProgress,
  Button,
} from "@mui/material";
import { Email, Phone, MoreVert } from "@mui/icons-material";
import axios from "axios";
import "./Leads.css";

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ builder: "", city: "", budget: "" });
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCards, setExpandedCards] = useState({}); // Keep track of expanded cards

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
        if (error.response && error.response.status === 403) {
          setError("Access forbidden. Please check your permissions.");
        } else {
          setError(
            `Failed to fetch leads. Status: ${
              error.response ? error.response.status : error.message
            }`
          );
        }
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
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleExpand = (index) => {
    setExpandedCards((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the expanded state for the card
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
      <Typography variant="h4" gutterBottom>
        Leads
      </Typography>

      {/* Toolbar for Search and Filters */}
      <Toolbar>
        <TextField
          label="Search"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FormControl sx={{ minWidth: 150, ml: 2 }}>
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
        <FormControl sx={{ minWidth: 150, ml: 2 }}>
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
        <FormControl sx={{ minWidth: 150, ml: 2 }}>
          <InputLabel>Budget</InputLabel>
          <Select
            value={filters.budget}
            onChange={(e) =>
              setFilters({ ...filters, budget: e.target.value })
            }
          >
            {Array.from(new Set(leads.map((lead) => lead.budget || "N/A"))).map(
              (budget, index) => (
                <MenuItem key={`budget-${index}`} value={budget}>
                  {budget}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150, ml: 2 }}>
          <InputLabel>Sort Order</InputLabel>
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="asc">Oldest First</MenuItem>
            <MenuItem value="desc">Newest First</MenuItem>
          </Select>
        </FormControl>
      </Toolbar>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredLeads.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Cards for Leads */}
      <Box className="lead-container">
        {filteredLeads
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((lead, index) => (
            <Box
              className="lead-card"
              key={lead._id || `${index}-${lead.timestamp}`}
            >
              {/* Top Section with Avatar, Name, and Contact */}
              <Box className="lead-card-header">
                <Avatar className="lead-avatar">
                  {lead.fullName?.[0] || "N"}
                </Avatar>
                <Box className="lead-info">
                  <Typography variant="h6" className="lead-name">
                    {lead.fullName || "N/A"}
                  </Typography>
                </Box>

                <Box className="lead-actions">
                  {/* Email Icon - Links to "mailto" */}
                  <IconButton
                    component="a"
                    href={`mailto:${lead.email || ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!lead.email}
                  >
                    <Email />
                  </IconButton>

                  {/* Phone Icon - Links to "tel" */}
                  <IconButton
                    component="a"
                    href={`tel:${lead.phoneNumber || ""}`}
                    disabled={!lead.phoneNumber}
                  >
                    <Phone />
                  </IconButton>

                  {/* More Options Icon */}
                  <IconButton>
                    <MoreVert />
                  </IconButton>
                </Box>
              </Box>

              {/* Bottom Section with Additional Details */}
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
                    {lead.address || "N/A"}
                  </Typography>
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Work Required</Typography>
                  <Typography variant="body2">
                    {lead.workRequired || "N/A"}
                  </Typography>
                </Box>
                <Box className="lead-detail">
                  <Typography variant="subtitle2">Extra Details</Typography>
                  <Typography variant="body2">
                    {expandedCards[index]
                      ? lead.details || "N/A"
                      : truncateText(lead.details || "N/A", 50)}
                  </Typography>
                  {lead.details && lead.details.length > 50 && (
                    <Button
                      size="small"
                      onClick={() => toggleExpand(index)}
                    >
                      {expandedCards[index] ? "Show Less" : "Show More"}
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
            </Box>
          ))}
      </Box>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredLeads.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default Leads;
