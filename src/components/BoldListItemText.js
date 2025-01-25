import React from "react";
import { ListItemText } from "@mui/material";

const BoldListItemText = ({ primary }) => (
  <ListItemText
    primary={primary}
    primaryTypographyProps={{
      sx: {
        fontWeight: "700",
        color: "#333",
      },
    }}
  />
);

export default BoldListItemText;
