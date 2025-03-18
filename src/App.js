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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
import StorageIcon from "@mui/icons-material/Storage";
import BuildIcon from "@mui/icons-material/Build";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// IMPORTANT: Import jwtDecode as default from 'jwt-decode'
// import { jwtDecode } from "jwt-decode";

import { ThemeProvider } from "@mui/material/styles";
import "./App.css";
import theme from "./theme";

// Your custom components
import CalendarView from "./components/Calendar/CalendarView";
import Leads from "./components/Leads/Leads";
import MyLeads from "./components/Leads/MyLeads";
import Login from "./components/Auth/Login";
import LogoutHandler from "./components/Auth/LogoutHandler";
import Dashboard from "./components/Dashboard";
import LeadDetailMobile from "./components/Leads/LeadDetailMobile";
import AppointmentsPage from "./components/Appointments/AppointmentsPage";
import ProposalsPage from "./components/ProposalsPage";
import DataMigration from "./components/Admin/DataMigration";
import AdminTools from "./components/Admin/AdminTools";
import BuilderManagement from "./components/Admin/BuilderManagement";

// Context providers
import { LeadsProvider } from "./components/Leads/LeadsContext";
import { UserRoleProvider } from "./components/Auth/UserRoleContext";

// UI
import BoldListItemText from "./components/Common/BoldListItemText";
import { onAuthStateChange } from "./firebase/auth";
import { logout } from "./firebase/auth";

// Session timeout
import useSessionTimeout from "./hooks/useSessionTimeout";
import SessionTimeoutDialog from "./components/Auth/SessionTimeoutDialog";

import {
  migrateLocalStorageToFirebase,
} from "./utils/migrateToFirebase";

// Add FirestoreUsageMonitor import
import FirestoreUsageMonitor from "./components/FirestoreUsageMonitor";

const drawerWidth = 250;

// Session timeout settings
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 60 * 1000; // 1 minute warning

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:1025px)");
  // const isTablet = useMediaQuery("(min-width:601px) and (max-width:1024px)");
  // const isMobile = useMediaQuery("(max-width:600px)");
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  
  // Session timeout state
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { resetTimer } = useSessionTimeout(SESSION_TIMEOUT);

  // Check if current path is a lead detail page
  const isLeadDetailPage =
    location.pathname.includes("/my-leads/") &&
    location.pathname !== "/my-leads";

  // Set up Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (userData) {
        // User is signed in
        // console.log("Auth Debug - User signed in:", userData.user.email);
        // console.log("Auth Debug - User role:", userData.role);
        // console.log("Auth Debug - User ID:", userData.user.uid);
        setUser(userData);
        setUsername(userData.user.displayName || userData.user.email);
        
        // Start session timeout monitoring when user is logged in
        if (resetTimer) {
          resetTimer();
        }
        
        // Initialize session manager
        if (window.sessionManager && typeof window.sessionManager.init === 'function') {
          try {
            window.sessionManager.init(SESSION_TIMEOUT);
          } catch (error) {
            console.error('Error initializing session manager:', error);
          }
        }
      } else {
        // User is signed out
        // console.log("Auth Debug - User signed out");
        setUser(null);
        setUsername("");
        setShowTimeoutWarning(false);
        
        // Clean up session manager
        if (window.sessionManager && typeof window.sessionManager.cleanup === 'function') {
          try {
            window.sessionManager.cleanup();
          } catch (error) {
            //console.error('Error cleaning up session manager:', error);
          }
        }
      }
      setAuthChecked(true);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [resetTimer]);

  // Set up warning before timeout
  useEffect(() => {
    if (user && resetTimer) {
      const warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);
      
      return () => clearTimeout(warningTimer);
    }
  }, [user, resetTimer]);

  // Reset session timer on user activity
  useEffect(() => {
    if (user && resetTimer) {
      // Event handler to reset the timer
      const handleUserActivity = () => {
        resetTimer();
        
        // If warning is showing, hide it since user is active
        if (showTimeoutWarning) {
          setShowTimeoutWarning(false);
        }
      };
      
      // Add event listeners for user activity
      document.addEventListener('click', handleUserActivity);
      document.addEventListener('keydown', handleUserActivity);
      document.addEventListener('mousemove', handleUserActivity);
      
      // Clean up
      return () => {
        document.removeEventListener('click', handleUserActivity);
        document.removeEventListener('keydown', handleUserActivity);
        document.removeEventListener('mousemove', handleUserActivity);
      };
    }
  }, [user, resetTimer, showTimeoutWarning]);

  // Check if migration is needed
  useEffect(() => {
    // Disable migration popup by commenting out the check
    // if (user && needsMigration()) {
    //   setShowMigrationDialog(true);
    // }
  }, [user]);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const handleLogout = async () => {
    try {
      // Clean up session manager
      if (window.sessionManager && typeof window.sessionManager.cleanup === 'function') {
        try {
          window.sessionManager.cleanup();
        } catch (error) {
          //console.error('Error cleaning up session manager:', error);
        }
      }
      
      await logout();
      setUser(null);
      setDrawerOpen(false);
      setShowTimeoutWarning(false);
    } catch (error) {
      //  console.error("Logout error:", error);
    }
  };

  // Handle continuing session
  const handleContinueSession = () => {
    setShowTimeoutWarning(false);
    resetTimer();
  };

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  // Handle migration
  const handleMigration = async () => {
    setMigrationInProgress(true);
    try {
      const success = await migrateLocalStorageToFirebase();
      if (success) {
        setMigrationComplete(true);
        // Close dialog after 2 seconds
        setTimeout(() => {
          setShowMigrationDialog(false);
          setMigrationComplete(false);
        }, 2000);
      }
    } catch (error) {
      //console.error('Migration error:', error);
    } finally {
      setMigrationInProgress(false);
    }
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
    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("leads") && !path.includes("my-leads")) return "Leads";
    if (path.includes("my-leads")) return "My Leads";
    if (path.includes("appointments")) return "Appointments";
    if (path.includes("proposals")) return "Proposals";
    if (path.includes("calendar")) return "Calendar";
    if (path.includes("admin-tools")) return "Admin Tools";
    if (path.includes("builder-management")) return "Builder Management";
    return "EA Building Works CRM";
  };

  return (
    <ThemeProvider theme={theme}>
      <UserRoleProvider role={user?.role || "guest"}>
        <LeadsProvider>
          <Box className="app-container">
            <CssBaseline />
            
            {/* Toast Container for notifications */}
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />

            {/* Session Timeout Warning Dialog */}
            <SessionTimeoutDialog
              open={showTimeoutWarning}
              onContinue={handleContinueSession}
              onLogout={handleLogout}
              warningDuration={WARNING_BEFORE_TIMEOUT}
              timeoutDuration={SESSION_TIMEOUT}
            />

            {/* AppBar for mobile/tablet - hide on lead detail page */}
            {user && !isDesktop && !isLeadDetailPage && (
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
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{ flexGrow: 1, fontWeight: 600 }}
                  >
                    {getPageTitle()}
                  </Typography>
                  {username && (
                    <Tooltip title={username}>
                      <Avatar
                        sx={{
                          bgcolor: "#E76F51",
                          width: 36,
                          height: 36,
                          fontSize: "0.9rem",
                        }}
                      >
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
                        position: "absolute",
                        right: 8,
                        top: 8,
                        color: "rgba(255,255,255,0.7)",
                        "&:hover": {
                          color: "white",
                          bgcolor: "rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                  )}
                </Toolbar>

                {username && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      padding: "16px 24px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Avatar sx={{ bgcolor: "#E76F51", width: 40, height: 40 }}>
                      {username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        {username}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(255,255,255,0.7)" }}
                      >
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
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Management
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/dashboard"
                        className={`sidebar-listitem ${
                          isActive("/dashboard") ? "active" : ""
                        }`}
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
                        className={`sidebar-listitem ${
                          isActive("/leads") && !isActive("/my-leads")
                            ? "active"
                            : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <PeopleIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Leads" />
                      </ListItemButton>

                      <Divider
                        sx={{ my: 2, bgcolor: "rgba(255,255,255,0.1)" }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Administration
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/admin-tools"
                        className={`sidebar-listitem ${
                          isActive("/admin-tools") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <AdminPanelSettingsIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Admin Tools" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/builder-management"
                        className={`sidebar-listitem ${
                          isActive("/builder-management") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <BuildIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Builder Management" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/data-migration"
                        className={`sidebar-listitem ${
                          isActive("/data-migration") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <StorageIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Data Migration" />
                      </ListItemButton>

                      <Divider
                        sx={{ my: 2, bgcolor: "rgba(255,255,255,0.1)" }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Work Management
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/my-leads"
                        className={`sidebar-listitem ${
                          isActive("/my-leads") ? "active" : ""
                        }`}
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
                        className={`sidebar-listitem ${
                          isActive("/appointments") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarMonthIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Appointments" />
                      </ListItemButton>

                      <Divider
                        sx={{ my: 2, bgcolor: "rgba(255,255,255,0.1)" }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Planning
                      </Typography>

                      <ListItemButton
                        component={Link}
                        to="/calendar"
                        className={`sidebar-listitem ${
                          isActive("/calendar") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarTodayIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Calendar" />
                      </ListItemButton>
                    </>
                  )}

                  {/* Builder Menu */}
                  {user?.role === "builder" && (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Work Management
                      </Typography>
                      <ListItemButton
                        component={Link}
                        to="/my-leads"
                        className={`sidebar-listitem ${
                          isActive("/my-leads") ? "active" : ""
                        }`}
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
                        className={`sidebar-listitem ${
                          isActive("/appointments") ? "active" : ""
                        }`}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon className="sidebar-listicon">
                          <CalendarMonthIcon />
                        </ListItemIcon>
                        <BoldListItemText primary="Appointments" />
                      </ListItemButton>

                      <Divider
                        sx={{ my: 2, bgcolor: "rgba(255,255,255,0.1)" }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          px: 3,
                          py: 1,
                          display: "block",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.7rem",
                        }}
                      >
                        Planning
                      </Typography>

                      <ListItemButton
                        component={Link}
                        to="/calendar"
                        className={`sidebar-listitem ${
                          isActive("/calendar") ? "active" : ""
                        }`}
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
                paddingTop:
                  user && !isDesktop && !isLeadDetailPage ? "64px" : "0",
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
                        <Route
                          path="/data-migration"
                          element={<DataMigration />}
                        />
                        <Route path="/admin-tools" element={<AdminTools />} />
                        <Route
                          path="/builder-management"
                          element={<BuilderManagement />}
                        />
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
                
                {/* Logout route - handles session timeout redirects */}
                <Route 
                  path="/logout" 
                  element={<LogoutHandler />} 
                />
              </Routes>
            </Box>
            
            {/* Add a minimized FirestoreUsageMonitor for admin users on mobile */}
            {user && user.role === "admin" && <FirestoreUsageMonitor />}

            {/* Migration Dialog */}
            <Dialog
              open={showMigrationDialog}
              onClose={() =>
                !migrationInProgress && setShowMigrationDialog(false)
              }
            >
              <DialogTitle>
                {migrationComplete ? "Migration Complete" : "Data Migration"}
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {migrationComplete
                    ? "Your data has been successfully migrated to the cloud. You can now access it from any device."
                    : "We've updated our app to use cloud storage instead of browser storage. Would you like to migrate your existing data to the cloud? This will allow you to access your data from any device."}
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                {!migrationComplete && (
                  <>
                    <Button
                      onClick={() => setShowMigrationDialog(false)}
                      disabled={migrationInProgress}
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleMigration}
                      variant="contained"
                      color="primary"
                      disabled={migrationInProgress}
                    >
                      {migrationInProgress ? "Migrating..." : "Migrate Data"}
                    </Button>
                  </>
                )}
                {migrationComplete && (
                  <Button
                    onClick={() => setShowMigrationDialog(false)}
                    variant="contained"
                    color="primary"
                  >
                    Close
                  </Button>
                )}
              </DialogActions>
            </Dialog>
          </Box>
        </LeadsProvider>
      </UserRoleProvider>
    </ThemeProvider>
  );
}

export default App;
