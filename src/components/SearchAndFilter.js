import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

const SearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  filters,
  setFilters,
  clearFilters,
  statuses,
  workRequiredOptions,
  budgetOptions,
  applyFilters,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = (open) => {
    setIsDrawerOpen(open);
  };

  const handleStatusChange = (status) => {
    const currentStatuses = filters.statuses || [];
    if (currentStatuses.includes(status)) {
      setFilters({
        ...filters,
        statuses: currentStatuses.filter((s) => s !== status),
      });
    } else {
      setFilters({ ...filters, statuses: [...currentStatuses, status] });
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 4 }}>
      {/* Search Bar */}
      <TextField
        label="Search"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            if (applyFilters) {
              applyFilters();
            } else {
              console.error("applyFilters is not defined!");
            }
          }
        }}
        sx={{ flex: 1 }}
      />

      {/* Items Per Page Dropdown */}
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Items Per Page</InputLabel>
        <Select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(e.target.value)}
        >
          {[10, 25, 50, 100].map((count) => (
            <MenuItem key={count} value={count}>
              {count}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Filter Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<FilterListIcon />}
        onClick={() => toggleDrawer(true)}
        sx={{ backgroundColor: "#7D9B76" }}
      >
        Filter
      </Button>

      {/* Clear Filters Button */}
      <Button
        variant="outlined"
        color="secondary"
        onClick={clearFilters}
        sx={{
          borderColor: "#7D9B76",
          color: "#7D9B76",
          "&:hover": {
            backgroundColor: "#f1f1f1",
          },
        }}
      >
        Clear Filters
      </Button>

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => toggleDrawer(false)}
      >
        <Box sx={{ width: 500, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Builder Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Builder</InputLabel>
            <Select
              value={filters.builder || ""}
              onChange={(e) =>
                setFilters({ ...filters, builder: e.target.value })
              }
            >
              {statuses.map((builder) => (
                <MenuItem key={builder} value={builder}>
                  {builder}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Full Name Filter */}
          <TextField
            label="Full Name"
            value={filters.fullName || ""}
            onChange={(e) =>
              setFilters({ ...filters, fullName: e.target.value })
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Phone Number Filter */}
          <TextField
            label="Phone Number"
            value={filters.phoneNumber || ""}
            onChange={(e) =>
              setFilters({ ...filters, phoneNumber: e.target.value })
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Address Filter */}
          <TextField
            label="Address"
            value={filters.address || ""}
            onChange={(e) =>
              setFilters({ ...filters, address: e.target.value })
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Work Required Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Work Required</InputLabel>
            <Select
              value={filters.workRequired || ""}
              onChange={(e) =>
                setFilters({ ...filters, workRequired: e.target.value })
              }
            >
              {workRequiredOptions.map((work) => (
                <MenuItem key={work} value={work}>
                  {work}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Budget Filter */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Budget</InputLabel>
            <Select
              value={filters.budget || ""}
              onChange={(e) =>
                setFilters({ ...filters, budget: e.target.value })
              }
            >
              {budgetOptions.map((budget) => (
                <MenuItem key={budget} value={budget}>
                  {budget}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* City Filter */}
          <TextField
            label="City"
            value={filters.city || ""}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Start Date Filter */}
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Email Filter */}
          <TextField
            label="Email"
            value={filters.email || ""}
            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Status Filters */}
          <Typography variant="subtitle1" gutterBottom>
            Status
          </Typography>
          <FormGroup>
            {statuses.map((status) => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    checked={(filters.statuses || []).includes(status)}
                    onChange={() => handleStatusChange(status)}
                  />
                }
                label={status}
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              sx={{
                borderColor: "#7D9B76",
                color: "#7D9B76",
                "&:hover": {
                  backgroundColor: "#f1f1f1",
                },
              }}
              onClick={clearFilters}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: "#7D9B76",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#6a8d64",
                },
              }}
              onClick={() => {
                toggleDrawer(false); // Close the drawer
                if (applyFilters) {
                  applyFilters(); // Call applyFilters if it exists
                } else {
                  console.error("applyFilters is not defined!");
                }
              }}
            >
              View Results
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default SearchAndFilter;
