import React, { useState } from "react";
import { TextField, Box, InputAdornment } from "@mui/material";
import SearchPopup from "./SearchPopup";
import { useLeads } from "./LeadsContext"; // Import the context hook
import SearchIcon from "@mui/icons-material/Search";

const SearchBar = () => {
  const { leads } = useLeads(); // Access leads from context
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpenPopup = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <Box sx={{ padding: "10px" }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search"
        onClick={handleOpenPopup}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon style={{ color: "#A6A6A6" }} />
            </InputAdornment>
          ),
          style: {
            cursor: "pointer",
            backgroundColor: "#f3f3f3",
            borderRadius: "5px",
            height: "40px",
            paddingLeft: "10px",
            fontWeight: "bold",
          },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "&:hover fieldset": {
              borderColor: "#D3D3D3",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#A6A6A6",
            },
          },
        }}
      />
      <SearchPopup open={isPopupOpen} handleClose={handleClosePopup} leads={leads} />
    </Box>
  );
};

export default SearchBar;
