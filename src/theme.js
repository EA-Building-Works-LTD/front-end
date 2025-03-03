import { createTheme } from "@mui/material/styles";

// Get the default theme (which contains the complete shadows array)
const defaultTheme = createTheme();

const theme = createTheme({
  palette: {
    primary: {
      main: "#7D9B76",
    },
    secondary: {
      main: "#A7BF9F",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
      main: "#f5f5f5", // Added for safety
    },
  },
  typography: {
    fontFamily: "'Encode Sans', sans-serif",
  },
  spacing: 8,
  shadows: defaultTheme.shadows, // Use the complete default shadows array
});

export default theme;
