import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

// Define color palette constants
const COLORS = {
  // Primary colors - Rich teal/blue-green palette
  primary: {
    main: "#2A9D8F", // Teal
    light: "#4DB6AC",
    dark: "#1E7168",
    contrastText: "#FFFFFF",
  },
  // Secondary colors - Warm accent colors
  secondary: {
    main: "#E76F51", // Coral
    light: "#F4A261", // Light orange
    dark: "#C5553D",
    contrastText: "#FFFFFF",
  },
  // Neutral colors
  neutral: {
    main: "#264653", // Dark blue-green
    light: "#E9ECEF", // Light gray
    medium: "#6C757D", // Medium gray
    dark: "#343A40", // Dark gray/almost black
  },
  // Background colors
  background: {
    default: "#F8F9FA", // Light gray background
    paper: "#FFFFFF",
    card: "#FFFFFF",
    dark: "#264653", // Dark blue-green
  },
  // Status colors
  status: {
    success: "#52B788", // Green
    warning: "#F8C537", // Yellow
    error: "#E63946", // Red
    info: "#457B9D", // Blue
  },
  // Text colors
  text: {
    primary: "#2B2D42", // Dark blue-gray
    secondary: "#6C757D", // Medium gray
    disabled: "#ADB5BD", // Light gray
    hint: "#6C757D", // Medium gray
  },
  // Border colors
  border: {
    light: "#DEE2E6",
    main: "#CED4DA",
    dark: "#ADB5BD",
  },
};

// Define typography constants
const TYPOGRAPHY = {
  fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  fontWeightExtraBold: 700,
  h1: {
    fontWeight: 600,
    fontSize: "2.5rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01562em",
  },
  h2: {
    fontWeight: 600,
    fontSize: "2rem",
    lineHeight: 1.2,
    letterSpacing: "-0.00833em",
  },
  h3: {
    fontWeight: 600,
    fontSize: "1.75rem",
    lineHeight: 1.2,
    letterSpacing: "0em",
  },
  h4: {
    fontWeight: 600,
    fontSize: "1.5rem",
    lineHeight: 1.2,
    letterSpacing: "0.00735em",
  },
  h5: {
    fontWeight: 600,
    fontSize: "1.25rem",
    lineHeight: 1.2,
    letterSpacing: "0em",
  },
  h6: {
    fontWeight: 600,
    fontSize: "1rem",
    lineHeight: 1.2,
    letterSpacing: "0.0075em",
  },
  subtitle1: {
    fontWeight: 500,
    fontSize: "1rem",
    lineHeight: 1.5,
    letterSpacing: "0.00938em",
  },
  subtitle2: {
    fontWeight: 500,
    fontSize: "0.875rem",
    lineHeight: 1.5,
    letterSpacing: "0.00714em",
  },
  body1: {
    fontWeight: 400,
    fontSize: "1rem",
    lineHeight: 1.5,
    letterSpacing: "0.00938em",
  },
  body2: {
    fontWeight: 400,
    fontSize: "0.875rem",
    lineHeight: 1.5,
    letterSpacing: "0.01071em",
  },
  button: {
    fontWeight: 500,
    fontSize: "0.875rem",
    lineHeight: 1.75,
    letterSpacing: "0.02857em",
    textTransform: "none",
  },
  caption: {
    fontWeight: 400,
    fontSize: "0.75rem",
    lineHeight: 1.66,
    letterSpacing: "0.03333em",
  },
  overline: {
    fontWeight: 400,
    fontSize: "0.75rem",
    lineHeight: 2.66,
    letterSpacing: "0.08333em",
    textTransform: "uppercase",
  },
};

// Define spacing constants
const SPACING = 8;

// Define shape constants
const SHAPE = {
  borderRadius: 8,
  cardBorderRadius: 12,
  buttonBorderRadius: 8,
};

// Create the base theme
let theme = createTheme({
  palette: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    text: COLORS.text,
    background: COLORS.background,
    error: {
      main: COLORS.status.error,
    },
    warning: {
      main: COLORS.status.warning,
    },
    info: {
      main: COLORS.status.info,
    },
    success: {
      main: COLORS.status.success,
    },
    divider: COLORS.border.main,
    neutral: COLORS.neutral,
  },
  typography: TYPOGRAPHY,
  spacing: SPACING,
  shape: SHAPE,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// Add component overrides
theme = createTheme(theme, {
  components: {
    // MUI Button customization
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.buttonBorderRadius,
          textTransform: "none",
          fontWeight: 500,
          boxShadow: "none",
          padding: "8px 16px",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "0 6px 10px rgba(0, 0, 0, 0.15)",
          },
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: COLORS.primary.dark,
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: COLORS.secondary.dark,
          },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
          },
        },
        text: {
          "&:hover": {
            backgroundColor: alpha(COLORS.primary.main, 0.08),
          },
        },
      },
    },
    // MUI Card customization
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.cardBorderRadius,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    // MUI Paper customization
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.borderRadius,
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        },
        elevation2: {
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    // MUI AppBar customization
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          backgroundImage: `linear-gradient(90deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
        },
      },
    },
    // MUI Drawer customization
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: `linear-gradient(135deg, ${COLORS.neutral.dark} 0%, ${COLORS.primary.dark} 100%)`,
          color: "#FFFFFF",
        },
      },
    },
    // MUI TextField customization
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: SHAPE.borderRadius,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: COLORS.primary.main,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: COLORS.primary.main,
              borderWidth: 2,
            },
          },
        },
      },
    },
    // MUI Table customization
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: COLORS.background.light,
          color: COLORS.text.primary,
        },
      },
    },
    // MUI List customization
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.borderRadius,
          "&.Mui-selected": {
            backgroundColor: alpha(COLORS.primary.main, 0.12),
            "&:hover": {
              backgroundColor: alpha(COLORS.primary.main, 0.18),
            },
          },
        },
      },
    },
    // MUI Chip customization
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    // MUI Avatar customization
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.primary.main,
        },
      },
    },
    // MUI Tabs customization
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          "&.Mui-selected": {
            fontWeight: 600,
          },
        },
      },
    },
    // MUI Dialog customization
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: SHAPE.cardBorderRadius,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        },
      },
    },
  },
});

// Make typography responsive
theme = responsiveFontSizes(theme);

export default theme;
