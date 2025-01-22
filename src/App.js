import React, { useState, useEffect } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Toolbar,
  ListItemButton,
  Button,
} from "@mui/material";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BuildIcon from "@mui/icons-material/Build";
import { jwtDecode } from "jwt-decode";
import { ThemeProvider } from "@mui/material/styles";
import "./index.css";
import theme from "./theme";

// Import components
import Leads from "./components/Leads";
import Builders from "./components/Builders";
import Login from "./components/Login";
import DashboardPage from "./components/Dashboard"; // <-- Import your new dashboard component
import SearchBar from "./components/SearchBar";
import EarningsPage from "./components/EarningsPage";
import { LeadsProvider } from "./components/LeadsContext";
import { UserRoleProvider } from "./components/UserRoleContext";

const drawerWidth = 230;

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // new

    // Define invoices and builders
    const [invoices, setInvoices] = useState([
      { id: 1, builderName: "H.Ali", date: "2025-01-01", status: "Done", amount: 1000 },
      { id: 2, builderName: "H.Ali", date: "2025-01-05", status: "Pending", amount: 500 },
      { id: 3, builderName: "N.Hussain", date: "2025-01-02", status: "Done", amount: 1360 },
      { id: 4, builderName: "M.Ahmed", date: "2025-01-03", status: "Done", amount: 255 },
    ]);
    const [builders, setBuilders] = useState([
      { id: 1, name: "H.Ali", image: "https://via.placeholder.com/40" },
      { id: 2, name: "N.Hussain", image: "https://via.placeholder.com/40" },
      { id: 3, name: "M.Ahmed", image: "https://via.placeholder.com/40" },
    ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
      // If no token, we’re done checking
      setAuthChecked(true);
      return;
    }

    try {
      const { exp } = jwtDecode(token);
      if (exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
      } else {
        // Token valid
        setUser({ role });
      }
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setUser(null);
    }
    // Mark that we've checked
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  // If still checking localStorage, show a loading indicator (or blank screen)
  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <UserRoleProvider role={user?.role || "guest"}>
        <LeadsProvider user={user}>
          <Box sx={{ display: "flex" }}>
            <CssBaseline />

            {/* Sidebar Navigation */}
            {user && (
              <Drawer
                variant="permanent"
                sx={{
                  width: drawerWidth,
                  flexShrink: 0,
                  [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    backgroundColor: "#DCDCC6",
                  },
                }}
              >
                <Toolbar>
                  <Box
                    component="img"
                    src="/EABuildingWorksLTD.png"
                    alt="EA Building Works Ltd Logo"
                    sx={{
                      height: 200,
                      mx: "auto",
                    }}
                  />
                </Toolbar>
                <SearchBar />
                <List>
                  {/* Dashboard Button -> now links to /dashboard */}
                  <ListItemButton component={Link} to="/dashboard">
                    <ListItemIcon>
                      <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" />
                  </ListItemButton>

                  {/* Admin-Specific Links */}
                  {user.role === "admin" && (
                    <ListItemButton component={Link} to="/leads">
                      <ListItemIcon>
                        <PeopleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Leads" />
                    </ListItemButton>
                  )}

                  {/* Builder-Specific Links */}
                  {(user.role === "admin" || user.role === "builder") && (
                    <ListItemButton component={Link} to="/builders">
                      <ListItemIcon>
                        <BuildIcon />
                      </ListItemIcon>
                      <ListItemText primary="Builders" />
                    </ListItemButton>
                  )}
                </List>
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </Box>
              </Drawer>
            )}

            {/* Main Content */}
            <Box
              component="main"
              sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}
            >
              <Toolbar />
              <Routes>
                {/* If user is null after we’ve checked, go to login */}
                {!user ? (
                  <Route path="*" element={<Navigate to="/login" replace />} />
                ) : (
                  <>
                    {/* New route for /dashboard => Your custom DashboardPage */}
                    <Route path="/dashboard" element={<DashboardPage />} />

                    <Route
                      path="/dashboard/earnings"
                      element={<EarningsPage invoices={invoices} builders={builders} />}
                    />

                    {/* Admin Routes */}
                    {user.role === "admin" && (
                      <Route path="/leads" element={<Leads />} />
                    )}

                    {/* Builder Routes */}
                    {(user.role === "admin" || user.role === "builder") && (
                      <Route path="/builders" element={<Builders />} />
                    )}

                    {/* Redirect user with role to their default page */}
                    <Route
                      path="*"
                      element={
                        user.role === "admin" ? (
                          <Navigate to="/dashboard" replace />
                        ) : (
                          <Navigate to="/builders" replace />
                        )
                      }
                    />
                  </>
                )}

                {/* Login Route */}
                <Route path="/login" element={<Login setUser={setUser} />} />
              </Routes>
            </Box>
          </Box>
        </LeadsProvider>
      </UserRoleProvider>
    </ThemeProvider>
  );
}

export default App;
