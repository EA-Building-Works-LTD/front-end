import React, { useState, useEffect } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItemIcon,
  Toolbar,
  ListItemButton,
  Button,
  IconButton,
  AppBar,
  useMediaQuery,
} from "@mui/material";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BuildIcon from "@mui/icons-material/Build";
import LogoutIcon from "@mui/icons-material/Logout";
import { jwtDecode } from "jwt-decode";

import { ThemeProvider } from "@mui/material/styles";
import "./App.css";
import theme from "./theme";

// Import components
import Leads from "./components/Leads";
import Builders from "./components/Builders";
import Login from "./components/Login";
import DashboardPage from "./components/Dashboard";
import EarningsPage from "./components/EarningsPage";
// import { LeadsProvider } from "./components/LeadsContext";
import { UserRoleProvider } from "./components/UserRoleContext";
import BoldListItemText from "./components/BoldListItemText";

const drawerWidth = 230;

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // State to manage drawer open/close
  const isDesktop = useMediaQuery("(min-width:1025px)"); // Media query to detect screen size

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
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
        setUser({ role });
      }
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setUser(null);
    }

    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
    setDrawerOpen(false); // Close the drawer on logout
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <UserRoleProvider role={user?.role || "guest"}>
        
          <Box className="app-container">
            <CssBaseline />

            {/* AppBar for mobile/tablet */}
            {user && !isDesktop && (
              <AppBar position="fixed" className="appbar">
                <Toolbar className="toolbar">
                  <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    onClick={toggleDrawer}
                    className="menu-button"
                  >
                    <MenuIcon />
                  </IconButton>
                </Toolbar>
              </AppBar>
            )}

            {/* Sidebar Navigation (conditionally rendered) */}
            {user && (
              <Drawer
                variant={isDesktop ? "permanent" : "temporary"}
                open={isDesktop || drawerOpen}
                onClose={toggleDrawer}
                classes={{
                  paper: "sidebar-paper",
                }}
                ModalProps={{
                  keepMounted: true,
                }}
              >
                <Toolbar className="sidebar-toolbar">
                  <Box
                    component="img"
                    src="/EABuildingWorksLTD.png"
                    alt="EA Building Works Ltd Logo"
                    className="sidebar-logo"
                    onClick={toggleDrawer}
                  />
                </Toolbar>
                <List className="sidebar-list">
                  <ListItemButton
                    component={Link}
                    to="/dashboard"
                    className="sidebar-listitem"
                    onClick={toggleDrawer}
                  >
                    <ListItemIcon className="sidebar-listicon">
                      <DashboardIcon />
                    </ListItemIcon>
                    <BoldListItemText 
                      primary="Dashboard"
                    />
                  </ListItemButton>

                  {user?.role === "admin" && (
                    <ListItemButton
                      component={Link}
                      to="/leads"
                      className="sidebar-listitem"
                      onClick={toggleDrawer}
                    >
                      <ListItemIcon className="sidebar-listicon">
                        <PeopleIcon />
                      </ListItemIcon>
                      <BoldListItemText  primary="Leads" />
                    </ListItemButton>
                  )}

                  {(user?.role === "admin" || user?.role === "builder") && (
                    <ListItemButton
                      component={Link}
                      to="/builders"
                      className="sidebar-listitem"
                      onClick={toggleDrawer}
                    >
                      <ListItemIcon className="sidebar-listicon">
                        <BuildIcon />
                      </ListItemIcon>
                      <BoldListItemText  primary="Builders" />
                    </ListItemButton>
                  )}
                </List>
                <Box className="sidebar-logout">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                    className="logout-button"
                  >
                    Logout
                  </Button>
                </Box>
              </Drawer>
            )}

            {/* Main Content */}
            <Box
              component="main"
              className="main-content"
              sx={{
                marginLeft: isDesktop && user ? `${drawerWidth}px` : 0,
                paddingTop: user && !isDesktop ? "64px" : "0",
              }}
            >
              <Routes>
                {!user ? (
                  <Route path="*" element={<Navigate to="/login" replace />} />
                ) : (
                  <>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route
                      path="/dashboard/earnings"
                      element={<EarningsPage invoices={[]} builders={[]} />}
                    />
                    {user.role === "admin" && (
                      <Route path="/leads" element={<Leads />} />
                    )}
                    {(user.role === "admin" || user.role === "builder") && (
                      <Route path="/builders" element={<Builders />} />
                    )}
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
                <Route path="/login" element={<Login setUser={setUser} />} />
              </Routes>
            </Box>
          </Box>
       
      </UserRoleProvider>
    </ThemeProvider>
  );
}

export default App;
