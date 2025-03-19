import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Toolbar,
  ListItemButton,
  ListItemIcon,
  IconButton,
  AppBar,
  useMediaQuery,
  Typography,
  Divider,
  Tooltip,
  Avatar,
} from "@mui/material";
import { useLocation, Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import BuildIcon from "@mui/icons-material/Build";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BoldListItemText from "./BoldListItemText";

const drawerWidth = 250;

const Navigation = ({ user, onLogout, username }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width:1025px)");
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      "/dashboard": "Dashboard",
      "/leads": "All Leads",
      "/my-leads": "My Leads",
      "/appointments": "Appointments",
      "/proposals": "Proposals",
      "/calendar": "Calendar",
      "/admin-tools": "Admin Tools",
      "/builder-management": "Builder Management",
      "/login": "Login",
    };
    return titles[path] || "My CRM";
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Tooltip title={username || user.email || "User"}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "secondary.main",
                    fontSize: "0.875rem",
                    mr: 1,
                  }}
                >
                  {username ? username.charAt(0).toUpperCase() : "U"}
                </Avatar>
              </Tooltip>
              <IconButton color="inherit" onClick={onLogout} aria-label="logout">
                <LogoutIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {!isDesktop && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
        )}
        <Divider />
        <List>
          {user && user.role === "admin" && (
            <>
              <ListItemButton
                component={Link}
                to="/dashboard"
                selected={isActive("/dashboard")}
                onClick={() => !isDesktop && setDrawerOpen(false)}
              >
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <BoldListItemText primary="Dashboard" />
              </ListItemButton>

              <ListItemButton
                component={Link}
                to="/leads"
                selected={isActive("/leads")}
                onClick={() => !isDesktop && setDrawerOpen(false)}
              >
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <BoldListItemText primary="All Leads" />
              </ListItemButton>
            </>
          )}

          <ListItemButton
            component={Link}
            to="/my-leads"
            selected={isActive("/my-leads")}
            onClick={() => !isDesktop && setDrawerOpen(false)}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <BoldListItemText primary="My Leads" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/appointments"
            selected={isActive("/appointments")}
            onClick={() => !isDesktop && setDrawerOpen(false)}
          >
            <ListItemIcon>
              <CalendarMonthIcon />
            </ListItemIcon>
            <BoldListItemText primary="Appointments" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/proposals"
            selected={isActive("/proposals")}
            onClick={() => !isDesktop && setDrawerOpen(false)}
          >
            <ListItemIcon>
              <DescriptionIcon />
            </ListItemIcon>
            <BoldListItemText primary="Proposals" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/calendar"
            selected={isActive("/calendar")}
            onClick={() => !isDesktop && setDrawerOpen(false)}
          >
            <ListItemIcon>
              <CalendarMonthIcon />
            </ListItemIcon>
            <BoldListItemText primary="Calendar" />
          </ListItemButton>

          {user && user.role === "admin" && (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItemButton
                component={Link}
                to="/admin-tools"
                selected={isActive("/admin-tools")}
                onClick={() => !isDesktop && setDrawerOpen(false)}
              >
                <ListItemIcon>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <BoldListItemText primary="Admin Tools" />
              </ListItemButton>

              <ListItemButton
                component={Link}
                to="/builder-management"
                selected={isActive("/builder-management")}
                onClick={() => !isDesktop && setDrawerOpen(false)}
              >
                <ListItemIcon>
                  <BuildIcon />
                </ListItemIcon>
                <BoldListItemText primary="Builder Management" />
              </ListItemButton>
            </>
          )}
        </List>
      </Drawer>
    </>
  );
};

export default Navigation; 