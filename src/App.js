// src/App.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  Toolbar,
  ListItemButton,
  ListItemIcon,
  Button,
  IconButton,
  AppBar,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

// IMPORTANT: Import jwtDecode as default from 'jwt-decode'
import {jwtDecode} from "jwt-decode";

import { ThemeProvider } from "@mui/material/styles";
import "./App.css";
import theme from "./theme";

// Your custom components
import CalendarView from "./components/Calendar/CalendarView";
import Leads from "./components/Leads";
import MyLeads from "./components/MyLeads";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import LeadDetailMobile from "./components/LeadDetailMobile";
import AppointmentsPage from "./components/AppointmentsPage";
import ProposalsPage from "./components/ProposalsPage";

// Context providers
import { LeadsProvider } from "./components/LeadsContext";
import { UserRoleProvider } from "./components/UserRoleContext";

// UI
import BoldListItemText from "./components/BoldListItemText";

const drawerWidth = 230;

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:1025px)");

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

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setUser(null);
    setDrawerOpen(false);
  };

  // Show spinner until auth check is done
  if (!authChecked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      {/* Missing curly brace added here ↓↓↓ */}
      <UserRoleProvider value={user?.role || "guest"}>
        <LeadsProvider>
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

            {/* Sidebar */}
            {user && (
              <Drawer
                variant={isDesktop ? "permanent" : "temporary"}
                open={isDesktop || drawerOpen}
                onClose={toggleDrawer}
                classes={{ paper: "sidebar-paper" }}
                ModalProps={{ keepMounted: true }}
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
                  {/* Admin Menu */}
                  {user?.role === "admin" && (
                    <>
                      <ListItemButton
                        component={Link}
                        to="/dashboard"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <DashboardIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Dashboard" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/leads"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <PeopleIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Leads" />
                      </ListItemButton>
                    </>
                  )}

                  {/* Builder Menu */}
                  {user?.role === "builder" && (
                    <>
                      <ListItemButton
                        component={Link}
                        to="/my-leads"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <NoteAltIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="My Leads" />
                      </ListItemButton>

                      <ListItemButton
                        component={Link}
                        to="/appointments"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarMonthIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Appointments" />
                      </ListItemButton>

                      <ListItemButton
                        component={Link}
                        to="/proposals"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <DescriptionIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Proposals" />
                      </ListItemButton>

                      <ListItemButton
                        component={Link}
                        to="/calendar"
                        className="sidebar-listitem"
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarTodayIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Calendar" />
                      </ListItemButton>
                    </>
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
                {/* If not logged in => redirect to /login */}
                {!user ? (
                  <Route path="*" element={<Navigate to="/login" replace />} />
                ) : (
                  <>
                    {/* Admin Routes */}
                    {user.role === "admin" && (
                      <>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route path="/my-leads" element={<MyLeads />} />
                      </>
                    )}

                    {/* Builder Routes */}
                    {user.role === "builder" && (
                      <>
                        <Route path="/my-leads" element={<MyLeads />} />
                        <Route path="/my-leads/:slug" element={<LeadDetailMobile />} />
                        <Route path="/appointments" element={<AppointmentsPage />} />
                        <Route path="/proposals" element={<ProposalsPage />} />
                        <Route path="/calendar" element={<CalendarView />} />
                      </>
                    )}

                    {/* Fallback based on role */}
                    <Route
                      path="*"
                      element={
                        user.role === "admin" ? (
                          <Navigate to="/dashboard" replace />
                        ) : (
                          <Navigate to="/my-leads" replace />
                        )
                      }
                    />
                  </>
                )}
                {/* Login route */}
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
