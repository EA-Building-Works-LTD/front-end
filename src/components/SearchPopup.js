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

  const searchInputRef = useRef(null); // Ref for automatically focusing on input

  // Automatically focus on search input when the modal opens
  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  // Load recent searches from localStorage when the component mounts
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Save recent searches to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Handle user search
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query) {
      const filteredResults = leads?.filter((lead) =>
        lead.fullName.toLowerCase().includes(query)
      );
      setResults(filteredResults);
    } else {
      setResults([]);
    }
  };

  // Handle adding to recent searches on result click
  const handleResultClick = (result) => {
    setHoveredResult(result); // Update hovered user details

    // Add the clicked user to recent searches, ensuring no duplicates and a max of 3 items
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item._id !== result._id);
      return [result, ...filtered].slice(0, 3);
    });
  };

  // Handle recent search click
  const handleRecentSearchClick = (recent) => {
    setSearchQuery(recent.fullName);
    setResults([recent]); // Show the specific recent search result
  };

  // Save the last search to "Recent Searches" on modal close
  const handleModalClose = () => {
    setSearchQuery("");
    setResults([]);
    setHoveredResult(null);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      aria-labelledby="search-popup"
    >
      <Box
        sx={{
          width: "600px",
          margin: "auto",
          marginTop: "100px",
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: 24,
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearch}
          inputRef={searchInputRef} // Attach the ref
          autoFocus // Automatically focuses on modal open
          InputProps={{
            startAdornment: (
              <Box sx={{ marginRight: "8px" }}>
                <Typography variant="h6">🔍</Typography>
              </Box>
            ),
          }}
        />

        {/* Recent Searches Section */}
        <Box mt={2}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Recent Searches
          </Typography>
          <List
            sx={{ display: "flex", flexDirection: "row", overflowX: "auto" }}
          >
            {recentSearches.map((recent) => (
              <ListItem
                key={recent._id}
                button
                onClick={() => handleRecentSearchClick(recent)}
              >
                <Avatar sx={{ bgcolor: "#7D9B76", marginRight: "8px" }}>
                  {recent.fullName.charAt(0)}
                </Avatar>
                <ListItemText
                  primary={recent.fullName}
                  sx={{ marginLeft: "5px" }}
                />
              </ListItem>
            ))}

            {recentSearches.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No recent searches.
              </Typography>
            )}
          </List>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 2 }} />

        {/* Conditionally Render Search Results and Hovered Details */}
        {searchQuery && (
          <Box sx={{ display: "flex", gap: 2 }}>
            {/* Left Column: Search Results */}
            <Box sx={{ width: "40%", borderRight: "1px solid #ddd" }}>
              <List>
                {results.map((result) => (
                  <ListItem
                    key={result._id}
                    button
                    onClick={() => handleResultClick(result)} // Add to recent searches on click
                    onMouseEnter={() => setHoveredResult(result)} // Show details on hover
                  >
                    <Avatar sx={{ bgcolor: "#7D9B76", marginRight: "8px" }}>
                      {result.fullName.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={result.fullName}
                      sx={{ marginLeft: "5px" }} // Add left margin to the text
                    />
                  </ListItem>
                ))}
                {searchQuery && results.length === 0 && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ p: 2 }}
                  >
                    No results found.
                  </Typography>
                )}
              </List>
            </Box>

            {/* Right Column: Hovered User Details */}
            <Box sx={{ width: "60%", padding: "15px" }}>
              {hoveredResult ? (
                <>
                  <Avatar
                    sx={{
                      bgcolor: "#7D9B76",
                      width: "60px",
                      height: "60px",
                      fontSize: "24px",
                      marginBottom: "16px",
                    }}
                  >
                    {hoveredResult.fullName.charAt(0)}
                  </Avatar>
                  <Typography variant="h6">{hoveredResult.fullName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    #{hoveredResult._id}
                  </Typography>
                  <Box mt={2}>
                    <Typography variant="body1">
                      Phone: {hoveredResult.phoneNumber}
                    </Typography>
                    <Typography variant="body1">
                      Email: {hoveredResult.email}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Hover over a user to see details.
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
