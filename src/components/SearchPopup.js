import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Modal,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
} from "@mui/material";

const SearchPopup = ({ open, handleClose, leads }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [hoveredResult, setHoveredResult] = useState(null);

  const searchInputRef = useRef(null);

  // Automatically focus on the input when the modal opens
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Save recent searches to localStorage when they change
  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);

    if (query) {
      // Make sure we're filtering on the correct fields that actually exist in leads
      const filteredResults = leads.filter((lead) =>
        (lead.fullName || "").toLowerCase().includes(query) ||
        (lead.city || "").toLowerCase().includes(query) ||
        (lead.builder || "").toLowerCase().includes(query)
      );
      setResults(filteredResults);
    } else {
      setResults([]);
    }
  };

  // Handle selecting a search result
  const handleResultClick = (result) => {
    setHoveredResult(result);

    // Add to recent searches (limit to 3)
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item._id !== result._id);
      return [result, ...filtered].slice(0, 3);
    });
  };

  // Handle closing the modal
  const handleModalClose = () => {
    setSearchQuery("");
    setResults([]);
    setHoveredResult(null);
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleModalClose}>
      <Box
        sx={{
          width: "80%",
          maxWidth: "800px",
          margin: "auto",
          marginTop: { xs: "50px", sm: "100px" },
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: 24,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Search Bar */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search leads by name, city, or builder..."
          value={searchQuery}
          onChange={handleSearch}
          inputRef={searchInputRef}
          autoFocus
          InputProps={{
            startAdornment: (
              <Typography variant="h6" sx={{ mr: 1 }}>
                🔍
              </Typography>
            ),
          }}
        />

        {/* Recent Searches */}
        <Box mt={2}>
          <Typography variant="subtitle1">Recent Searches</Typography>
          <List sx={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {recentSearches.length > 0 ? (
              recentSearches.map((recent) => (
                <ListItem
                  key={recent._id}
                  button
                  onClick={() => handleResultClick(recent)}
                >
                  <Avatar sx={{ bgcolor: "#7D9B76" }}>
                    {recent.fullName?.charAt(0) || "?"}
                  </Avatar>
                  <ListItemText sx={{ ml: 1 }} primary={recent.fullName} />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No recent searches.
              </Typography>
            )}
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Search Results */}
        {searchQuery && (
          <Box sx={{ display: "flex", gap: 2 }}>
            {/* Results List */}
            <Box sx={{ width: "40%", borderRight: "1px solid #ddd" }}>
              <List>
                {results.length > 0 ? (
                  results.map((result) => (
                    <ListItem
                      key={result._id}
                      button
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setHoveredResult(result)}
                    >
                      <Avatar sx={{ bgcolor: "#7D9B76", mr: 1 }}>
                        {result.fullName?.charAt(0) || "?"}
                      </Avatar>
                      <ListItemText
                        primary={result.fullName}
                        secondary={`${result.city || "N/A"} - ${
                          result.builder || "N/A"
                        }`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ p: 2 }}
                    color="textSecondary"
                  >
                    No results found.
                  </Typography>
                )}
              </List>
            </Box>

            {/* Hovered User Details */}
            <Box sx={{ width: "60%", padding: "15px" }}>
              {hoveredResult ? (
                <>
                  <Avatar
                    sx={{
                      bgcolor: "#7D9B76",
                      width: 60,
                      height: 60,
                      fontSize: 24,
                      mb: 2,
                    }}
                  >
                    {hoveredResult.fullName?.charAt(0) || "?"}
                  </Avatar>
                  <Typography variant="h6">{hoveredResult.fullName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    #{hoveredResult._id}
                  </Typography>
                  <Box mt={2}>
                    <Typography>
                      Phone: {hoveredResult.phoneNumber || "N/A"}
                    </Typography>
                    <Typography>Email: {hoveredResult.email || "N/A"}</Typography>
                    <Typography>City: {hoveredResult.city || "N/A"}</Typography>
                    <Typography>
                      Builder: {hoveredResult.builder || "N/A"}
                    </Typography>
                    <Typography>
                      Budget: {hoveredResult.budget || "N/A"}
                    </Typography>
                    <Typography>
                      Address: {hoveredResult.address || "N/A"}
                    </Typography>
                    <Typography>
                      Work Required: {hoveredResult.workRequired || "N/A"}
                    </Typography>
                    <Typography>
                      Extra Details: {hoveredResult.details || "N/A"}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Hover over a lead to see details.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default SearchPopup;
