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
  Typography,
  Divider,
  Tooltip,
  Avatar,
} from "@mui/material";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

// IMPORTANT: Import jwtDecode as default from 'jwt-decode'
import { jwtDecode } from "jwt-decode";

import { ThemeProvider, useTheme } from "@mui/material/styles";
import "./App.css";
import theme from "./theme";

// Your custom components
import CalendarView from "./components/Calendar/CalendarView";
import Leads from "./components/Leads/Leads";
import MyLeads from "./components/Leads/MyLeads";
import Login from "./components/Auth/Login";
import Dashboard from "./components/Dashboard";
import LeadDetailMobile from "./components/Leads/LeadDetailMobile";
import AppointmentsPage from "./components/Appointments/AppointmentsPage";
import ProposalsPage from "./components/ProposalsPage";

// Context providers
import { LeadsProvider } from "./components/Leads/LeadsContext";
import { UserRoleProvider } from "./components/Auth/UserRoleContext";

// UI
import BoldListItemText from "./components/Common/BoldListItemText";

const drawerWidth = 250;

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:1025px)");
  const isTablet = useMediaQuery("(min-width:601px) and (max-width:1024px)");
  const isMobile = useMediaQuery("(max-width:600px)");
  const location = useLocation();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }

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

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  // Show spinner until auth check is done
  if (!authChecked) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('leads') && !path.includes('my-leads')) return 'Leads';
    if (path.includes('my-leads')) return 'My Leads';
    if (path.includes('appointments')) return 'Appointments';
    if (path.includes('proposals')) return 'Proposals';
    if (path.includes('calendar')) return 'Calendar';
    return 'EA Building Works CRM';
  };

  return (
    <ThemeProvider theme={theme}>
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
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                    {getPageTitle()}
                  </Typography>
                  {username && (
                    <Tooltip title={username}>
                      <Avatar sx={{ bgcolor: '#E76F51', width: 36, height: 36, fontSize: '0.9rem' }}>
                        {username.charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  )}
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
                  {!isDesktop && (
                    <IconButton 
                      onClick={toggleDrawer}
                      sx={{ 
                        position: 'absolute', 
                        right: 8, 
                        top: 8, 
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { color: 'white', bgcolor: 'rgba(0,0,0,0.1)' }
                      }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                  )}
                </Toolbar>
                
                {username && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <Avatar sx={{ bgcolor: '#E76F51', width: 40, height: 40 }}>
                      {username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {username}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <List className="sidebar-list">
                  {/* Admin Menu */}
                  {user?.role === "admin" && (
                    <>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          px: 3, 
                          py: 1, 
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontSize: '0.7rem'
                        }}
                      >
                        Management
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/dashboard"
                        className={`sidebar-listitem ${isActive('/dashboard') ? 'active' : ''}`}
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
                        className={`sidebar-listitem ${isActive('/leads') && !isActive('/my-leads') ? 'active' : ''}`}
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
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          px: 3, 
                          py: 1, 
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontSize: '0.7rem'
                        }}
                      >
                        Work Management
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/my-leads"
                        className={`sidebar-listitem ${isActive('/my-leads') ? 'active' : ''}`}
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
                        className={`sidebar-listitem ${isActive('/appointments') ? 'active' : ''}`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarMonthIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Appointments" />
                      </ListItemButton>

                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          px: 3, 
                          py: 1, 
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontSize: '0.7rem'
                        }}
                      >
                        Documents
                      </Typography>

                      <ListItemButton
                        component={Link}
                        to="/proposals"
                        className={`sidebar-listitem ${isActive('/proposals') ? 'active' : ''}`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <DescriptionIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Proposals" />
                      </ListItemButton>

                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                      
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          px: 3, 
                          py: 1, 
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontSize: '0.7rem'
                        }}
                      >
                        Planning
                      </Typography>

                      <ListItemButton
                        component={Link}
                        to="/calendar"
                        className={`sidebar-listitem ${isActive('/calendar') ? 'active' : ''}`}
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
                        <Route
                          path="/my-leads/:slug"
                          element={<LeadDetailMobile />}
                        />
                        <Route
                          path="/appointments"
                          element={<AppointmentsPage />}
                        />
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
