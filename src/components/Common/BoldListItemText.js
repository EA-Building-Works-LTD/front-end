import React from "react";
import { ListItemText } from "@mui/material";
import { useLocation } from "react-router-dom";

const BoldListItemText = ({ primary }) => {
  const location = useLocation();
  const isActive = location.pathname.includes(primary.toLowerCase().replace(/\s+/g, '-'));
  
  return (
    <ListItemText
      primary={primary}
      primaryTypographyProps={{
        sx: {
          fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
          fontWeight: isActive ? "600" : "500",
          fontSize: "0.95rem",
          letterSpacing: "0.3px",
          color: "white",
          opacity: isActive ? 1 : 0.85,
          transition: "all 0.2s ease",
          textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
          "&:hover": {
            opacity: 1,
          }
        },
      }}
    />
  );
};

export default BoldListItemText;
