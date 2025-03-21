// src/MyLeads.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Avatar,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useMediaQuery,
  Drawer,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  FormHelperText,
  Tooltip,
  Snackbar,
  Badge,
  Alert,
} from "@mui/material";
import { 
  Search, 
  FilterList, 
  ArrowBack, 
  ArrowForward, 
  FolderOpen,
  Assignment,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Send,
  SortByAlpha,
  CalendarToday,
  Sync,
  Notifications,
  NotificationsActive,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { getLeadsByBuilder } from "../../firebase/leads";
import { auth } from "../../firebase/config";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { useUserRole } from "../Auth/UserRoleContext";
import axios from "axios";
import "./MyLeads.css";
import { 
  fetchAndSyncNewLeads
} from "../../firebase/googleFormIntegration";

// Helper functions for localStorage
const getLeadDataFromStorage = () => {
  try {
    const data = localStorage.getItem(`myLeadData_${auth.currentUser?.uid || 'anonymous'}`);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return {};
  }
};

const saveLeadDataToStorage = (data) => {
  try {
    localStorage.setItem(`myLeadData_${auth.currentUser?.uid || 'anonymous'}`, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Helper function to truncate text
const truncateText = (text, maxLength = 30) => {
  if (!text) return "N/A";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const MyLeads = () => {
  // Get location from React Router to check for state
  const location = useLocation();
  
  // API state
  const [leads, setLeads] = useState(location.state?.cachedLeads || []);
  const [loading, setLoading] = useState(!location.state?.cachedLeads);
  const [error, setError] = useState("");
  const [dataSource, setDataSource] = useState(location.state?.dataSource || "firebase"); // 'firebase' or 'googleSheets'
  
  // Get user role from context
  const userRole = useUserRole();
  console.log("Current user role in MyLeads:", userRole); // Debug user role

  // For row-click detail drawer (desktop)
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pagination - restore from cached state if available
  const [currentPage, setCurrentPage] = useState(location.state?.currentPage || 1);
  const itemsPerPage = 10;

  // Global search term - restore from cached state if available
  const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || "");

  // Total leads count from Google Sheets
  const [totalGoogleSheetLeads, setTotalGoogleSheetLeads] = useState(location.state?.totalGoogleSheetLeads || 0);

  // Stage filter tabs – "All Customers" plus the six stage statuses
  const stageTabs = [
    "All Customers",
    "New Lead",
    "In Progress",
    "Quote Sent",
    "Completed",
    "Rejected",
    "Cancelled",
  ];
  const [selectedStage, setSelectedStage] = useState(location.state?.selectedStage || "All Customers");

  // Date filter options
  const dateFilterOptions = [
    { value: "", label: "All Time" },
    { value: "7days", label: "Last 7 Days" },
    { value: "14days", label: "Last 14 Days" },
    { value: "21days", label: "Last 21 Days" },
    { value: "1month", label: "Last Month" },
    { value: "3months", label: "Last 3 Months" },
    { value: "6months", label: "Last 6 Months" },
    { value: "1year", label: "Last Year" },
    { value: "1yearplus", label: "Older than 1 Year" },
  ];

  // Filters state for each field – restore from cached state if available
  const [filters, setFilters] = useState(location.state?.filters || {
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
    dateAdded: "", // New date filter
  });
  
  // Applied filters state - restore from cached state if available
  const [appliedFilters, setAppliedFilters] = useState(location.state?.appliedFilters || {
    customerName: "",
    address: "",
    city: "",
    workRequired: "",
    details: "",
    budget: "",
    dateAdded: "", // New date filter
  });

  // State for filter drawer open/close
  const [filterOpen, setFilterOpen] = useState(false);

  // State for view mode (grouped or list) - restore from cached state if available
  const [viewMode, setViewMode] = useState(location.state?.viewMode || "list");

  // State for tracking expanded stages in grouped view - restore from cached state if available
  const [expandedStages, setExpandedStages] = useState(location.state?.expandedStages || {});
  
  // Number of leads to show initially per stage
  const initialLeadsPerStage = 3;
  
  // Number of additional leads to load each time
  const leadsLoadIncrement = 5;
  
  // State to track how many leads are shown for each stage - restore from cached state if available
  const [visibleLeadsCount, setVisibleLeadsCount] = useState(location.state?.visibleLeadsCount || {});

  // Sync state
  const [syncingForms, setSyncingForms] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  // New state for auto-sync and new leads notification
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    localStorage.getItem("autoSyncEnabled") === "true"
  );
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [newLeadsAlert, setNewLeadsAlert] = useState(false);
  const autoSyncIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(Date.now());

  // Track if component is mounted to prevent state updates after unmounting
  const isMounted = useRef(true);
  
  // Track if data has been loaded at least once
  const dataLoadedOnce = useRef(!!location.state?.cachedLeads);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();

  // Replace useFirebaseState with direct localStorage access
  // This removes the unnecessary Firebase real-time listener
  const [myLeadData, setMyLeadData] = useState(getLeadDataFromStorage());
  
  // Effect to save myLeadData to localStorage when it changes
  useEffect(() => {
    if (Object.keys(myLeadData).length > 0) {
      saveLeadDataToStorage(myLeadData);
      // When myLeadData changes, update the combined leads
      if (leads.length > 0) {
        const updatedLeads = leads.map(lead => ({
          ...lead,
          stage: myLeadData[lead._id]?.stage || "New Lead"
        }));
        setLeads(updatedLeads);
      }
    }
  }, [myLeadData, leads]); // Added leads to dependency array

  // Function to fetch Google leads - extracted for reuse
  const fetchGoogleLeads = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    
    const response = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/google-leads`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data;
  }, []);

  // Function to fetch leads - replace instances where we used allLeadData with myLeadData
  const fetchLeads = useCallback(async (showNotification = true) => {
    try {
      // Skip fetching if we already have cached leads from navigation state
      if (dataLoadedOnce.current && leads.length > 0) {
        console.log("Using cached leads data, skipping fetch");
        setLoading(false);
        return;
      }
      
      if (!auth.currentUser) {
        setError("You must be logged in to view leads");
        setLoading(false);
        return;
      }
      
      // Check if the user is an admin
      const isAdmin = userRole === "admin" || userRole?.isAdmin === true || userRole?.role === "admin";
      
      let fetchedLeads = [];
      let source = "firebase";
      
      // Try to fetch from Firebase first
      try {
        fetchedLeads = await getLeadsByBuilder(auth.currentUser.uid, isAdmin);
        // console.log("Fetched leads from Firebase:", fetchedLeads.length);
        
        // If we got leads from Firebase, use them
        if (fetchedLeads && fetchedLeads.length > 0) {
          source = "firebase";
        } else if (isAdmin) {
          // For admins, even with no leads, continue using Firebase
          source = "firebase";
        } else {
          // If no leads in Firebase, try Google Sheets
          throw new Error("No leads found in Firebase");
        }
      } catch (firebaseError) {
        // console.error("Error fetching leads from Firebase:", firebaseError);
        
        // Fallback to Google Sheets
        try {
          const googleLeads = await fetchGoogleLeads();
          
          // If admin, show all leads from Google Sheets without filtering
          if (isAdmin) {
            fetchedLeads = googleLeads;
            source = "googleSheets";
            // console.log("Admin user - fetched all leads from Google Sheets:", fetchedLeads.length);
          } else {
            // For non-admin users, filter leads by builder name
            fetchedLeads = googleLeads;
            source = "googleSheets";
            // console.log("Fetched leads from Google Sheets:", fetchedLeads.length);
            
            // Get the builder's display name and email
            const displayName = auth.currentUser.displayName || "";
            const email = auth.currentUser.email || "";
            
            // First, directly check for leads assigned by builderId
            const leadsByBuilderId = fetchedLeads.filter(lead => 
              lead.builderId === auth.currentUser.uid
            );
            
            // Then filter the remaining leads by builder name
            const remainingLeads = fetchedLeads.filter(lead => 
              !leadsByBuilderId.some(idLead => idLead._id === lead._id)
            );
            
            let nameMatchedLeads = [];
            
            // Check if the user has a display name set
            if (displayName) {
              // console.log(`Looking for leads with builder name matching displayName: "${displayName}"`);
              
              // Filter leads where the builder field matches the display name (case-insensitive)
              nameMatchedLeads = remainingLeads.filter(lead => {
                if (!lead.builder) return false;
                
                // Skip if this lead has been reassigned to another builder
                if (lead.reassigned && lead.builderId && lead.builderId !== auth.currentUser.uid) return false;
                
                const builderLower = lead.builder.toLowerCase().trim();
                const displayNameLower = displayName.toLowerCase().trim();
                
                // Check for exact or partial matches
                const isMatch = builderLower.includes(displayNameLower) || 
                               displayNameLower.includes(builderLower);
                
                if (isMatch) {
                  // console.log(`Match found - Lead builder: "${lead.builder}" matches with displayName: "${displayName}"`);
                }
                
                return isMatch;
              });
              
                // console.log(`Found ${nameMatchedLeads.length} leads matching displayName: "${displayName}"`);
            }
            // Special case for Zain (email: gcconstruction@live.co.uk)
            else if (email.toLowerCase() === "gcconstruction@live.co.uk") {
              // console.log("Special case for Zain - looking for leads with 'Zain' in builder field");
              nameMatchedLeads = remainingLeads.filter(lead => {
                if (!lead.builder) return false;
                
                // Skip if this lead has been reassigned to another builder
                if (lead.reassigned && lead.builderId && lead.builderId !== auth.currentUser.uid) return false;
                
                return lead.builder.toLowerCase().includes("zain");
              });
              // console.log("Found Zain's leads:", nameMatchedLeads.length);
            } 
            // Fallback to email-based matching if no display name and not Zain
            else {
              // console.log("No displayName set - falling back to email-based matching");
              
              // Create a set of possible builder identifiers to match against
              const possibleMatches = new Set();
              
              // Extract username from email
              if (email) {
                const username = email.split('@')[0];
                possibleMatches.add(username.toLowerCase());
                
                // Add variations of username (split by common separators)
                username.split(/[._-]/).forEach(part => {
                  if (part.length > 2) { // Only consider parts longer than 2 chars
                    possibleMatches.add(part.toLowerCase());
                  }
                });
              }
              
              // console.log("Possible builder name matches from email:", [...possibleMatches]);
              
              // Filter leads where the builder field matches any of the possible identifiers
              nameMatchedLeads = remainingLeads.filter(lead => {
                if (!lead.builder) return false;
                
                // Skip if this lead has been reassigned to another builder
                if (lead.reassigned && lead.builderId && lead.builderId !== auth.currentUser.uid) return false;
                
                const builderLower = lead.builder.toLowerCase().trim();
                
                // Check if any of our possible matches are contained in the builder field
                const isMatch = [...possibleMatches].some(match => 
                  builderLower.includes(match) || match.includes(builderLower)
                );
                
                if (isMatch) {
                  // console.log(`Match found - Lead builder: "${lead.builder}" matches with "${[...possibleMatches].find(m => builderLower.includes(m) || m.includes(builderLower))}"`);
                }
                
                return isMatch;
              });
              
              // console.log("Filtered leads count:", nameMatchedLeads.length);
            }
            
            // Combine leads assigned by builderId with those matched by name
            fetchedLeads = [...leadsByBuilderId, ...nameMatchedLeads];
            // console.log("Total combined leads:", fetchedLeads.length);
          }
        } catch (apiError) {
          // console.error("Error fetching leads from API:", apiError);
          if (isMounted.current) {
            setError("Failed to fetch leads. Please try again later.");
            setLoading(false);
          }
          return;
        }
      }
      
      // Set the data source for UI indication
      if (isMounted.current) {
        setDataSource(source);
      }
      
      // Sort leads by timestamp descending
      let sortedLeads = [];
      try {
        sortedLeads = fetchedLeads.sort(
          (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
        );
      } catch (sortError) {
        console.error("Error sorting leads:", sortError);
        sortedLeads = fetchedLeads; // Use unsorted leads if sorting fails
      }
      
      if (isMounted.current) {
        setLeads(sortedLeads);
        dataLoadedOnce.current = true;
        setLoading(false);
      }
      
      // Clear new leads notification if we're refreshing the leads
      if (showNotification) {
        clearNewLeadsNotification();
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      if (isMounted.current) {
        setError("Failed to fetch leads. Please try again later.");
        setLoading(false);
      }
    } finally {
      // Ensure loading state is turned off
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userRole, fetchGoogleLeads, leads.length]);

  // Function to clear new leads notification
  const clearNewLeadsNotification = () => {
    setNewLeadsCount(0);
    setNewLeadsAlert(false);
  };

  // Function to fetch only new leads and sync them
  const fetchNewLeads = useCallback(async (showNotification = true) => {
    if (userRole !== "admin" && userRole?.role !== "admin" && userRole?.isAdmin !== true) {
      return;
    }
    
    try {
      // Only show loading indicator if manually triggered
      if (showNotification) {
        setSyncingForms(true);
        setSyncMessage("Checking for new leads...");
      }
      
      // Use the new function to fetch and sync only new leads
      const result = await fetchAndSyncNewLeads(fetchGoogleLeads);
      
      // Update last sync time
      lastSyncTimeRef.current = Date.now();
      
      if (result.newLeads && result.newLeads.length > 0) {
        // If we found new leads, refresh the leads list
        await fetchLeads();
        
        // Show notification about new leads
        if (showNotification) {
          setSyncMessage(`Found ${result.newLeads.length} new leads! ${result.message}`);
          setSnackbarOpen(true);
        } else {
          // If auto-sync, update the badge count
          setNewLeadsCount(prev => prev + result.newLeads.length);
          setNewLeadsAlert(true);
        }
      } else if (showNotification) {
        // Only show "no new leads" message if manually triggered
        setSyncMessage("No new leads found");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error fetching new leads:", error);
      if (showNotification) {
        setSyncMessage("Error checking for new leads: " + error.message);
        setSnackbarOpen(true);
      }
    } finally {
      if (showNotification) {
        setSyncingForms(false);
      }
    }
  }, [userRole, fetchGoogleLeads, fetchLeads]);

  // Function to sync Google Form submissions
  const syncLeads = useCallback(async (force = false) => {
    setSyncingForms(true);
    setSyncMessage("Syncing leads from Google Sheets...");
    
    try {
      // Call the updated fetchAndSyncNewLeads function with the force parameter
      const result = await fetchAndSyncNewLeads(force);
      
      if (result.success) {
        setSyncMessage(`${result.message}`);
        // Refresh leads after sync
        fetchLeads();
      } else {
        setSyncMessage(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error syncing leads:", error);
      setSyncMessage(`Error syncing: ${error.message}`);
    } finally {
      setSyncingForms(false);
      // Show sync message for 5 seconds
      setTimeout(() => {
        setSyncMessage("");
      }, 5000);
    }
  }, [fetchLeads, setSyncingForms, setSyncMessage]);

  // Update the useEffect hook that handles auto-sync
  useEffect(() => {
    // Check if auto-sync is enabled in localStorage
    const autoSyncSetting = localStorage.getItem('autoSyncEnabled');
    setAutoSyncEnabled(autoSyncSetting === 'true');
    
    // Set up interval for auto-sync if enabled
    let syncInterval;
    
    if (autoSyncEnabled && (userRole === "admin" || userRole?.role === "admin" || userRole?.isAdmin === true)) {
      console.log("Auto-sync is enabled, setting up interval");
      
      // Initial sync when component mounts
      syncLeads(false);
      
      // Set up interval for auto-sync (every 5 minutes)
      syncInterval = setInterval(() => {
        console.log("Auto-sync triggered");
        syncLeads(false); // Regular sync, not forced
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [autoSyncEnabled, userRole, syncLeads, fetchLeads]);

  // Toggle auto-sync
  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    localStorage.setItem("autoSyncEnabled", newValue.toString());
  };

  // Fetch total leads count from Google Sheets
  const fetchTotalLeadsCount = async () => {
    try {
      //console.log("Fetching total leads count from Google Sheets...");
      const token = localStorage.getItem("token");
      if (!token) {
        //console.error("No token found for fetching total leads count");
        return;
      }
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/google-leads`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data && Array.isArray(response.data)) {
        const totalCount = response.data.length;
        //console.log(`Total leads in Google Sheet: ${totalCount}`);
        setTotalGoogleSheetLeads(totalCount);
      } else {
        //console.error("Invalid response data format:", response.data);
      }
    } catch (error) {
      //console.error("Error fetching total leads count:", error);
    }
  };

  // Fetch leads on mount and when userRole changes, but only if we don't have cached data
  useEffect(() => {
    if (!dataLoadedOnce.current || leads.length === 0) {
      fetchLeads();
    }
    
    // Always fetch the total leads count for admin users
    const isAdmin = userRole?.isAdmin || userRole === "admin";
    //console.log("Current user role:", userRole, "Is admin:", isAdmin);
    
    if (isAdmin && !location.state?.totalGoogleSheetLeads) {
      //console.log("User is admin, fetching total leads count");
      fetchTotalLeadsCount();
    }
  }, [userRole, fetchLeads, leads.length, location.state?.totalGoogleSheetLeads]);

  // Add a separate useEffect to ensure totalGoogleSheetLeads is set correctly
  useEffect(() => {
    // Check if we're an admin user but don't have the total count yet
    const isAdmin = userRole?.isAdmin || userRole === "admin";
    if (isAdmin && totalGoogleSheetLeads === 0) {
      // console.log("Admin user detected but total count is 0, fetching total leads count");
      fetchTotalLeadsCount();
    }
  }, [totalGoogleSheetLeads, userRole]);
  // Merge each API lead with Firebase data so that each lead gets a "stage" property.
  // Note: This array contains ALL leads regardless of stage or age.
  // The filtering by stage happens later when the user clicks on a stage tab.
  const combinedLeads = leads.map((lead) => {
    // Always prioritize the stage from myLeadData over what's in the lead object
    const leadData = myLeadData[lead._id];
    const stage = leadData?.stage || lead.stage || "New Lead";
    
    return {
      ...lead,
      stage,
    };
  });

  // Helper: Get unique values for a given field from combinedLeads.
  const getUniqueValues = (field) => {
    const values = combinedLeads.map((lead) => lead[field]).filter((v) => !!v);
    return Array.from(new Set(values));
  };

  const cityOptions = getUniqueValues("city");
  const budgetOptions = getUniqueValues("budget");

  // Filter leads by global search term.
  let filteredLeads = combinedLeads.filter((lead) => {
    const nameMatch = lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch = lead.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || addressMatch;
  });

  // Apply field-specific filters (from appliedFilters).
  if (appliedFilters.customerName) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.fullName?.toLowerCase() === appliedFilters.customerName.toLowerCase()
    );
  }
  if (appliedFilters.address) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.address?.toLowerCase() === appliedFilters.address.toLowerCase()
    );
  }
  if (appliedFilters.city) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.city?.toLowerCase() === appliedFilters.city.toLowerCase()
    );
  }
  if (appliedFilters.workRequired) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.workRequired?.toLowerCase() === appliedFilters.workRequired.toLowerCase()
    );
  }
  if (appliedFilters.details) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.details?.toLowerCase() === appliedFilters.details.toLowerCase()
    );
  }
  if (appliedFilters.budget) {
    filteredLeads = filteredLeads.filter(
      (lead) =>
        lead.budget?.toLowerCase() === appliedFilters.budget.toLowerCase()
    );
  }
  
  // Apply date filter
  if (appliedFilters.dateAdded) {
    const now = new Date();
    let filterDate;
    
    switch (appliedFilters.dateAdded) {
      case "7days":
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "14days":
        filterDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "21days":
        filterDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1month":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "3months":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "6months":
        filterDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1year":
        filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) >= filterDate);
        break;
      case "1yearplus":
        filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredLeads = filteredLeads.filter(lead => new Date(lead.timestamp) < filterDate);
        break;
      default:
        break;
    }
  }

  // Then filter by selected stage (unless "All Customers" is chosen).
  // This is where we filter the leads based on the selected stage tab.
  // "All Customers" shows all leads regardless of stage.
  // Other tabs (like "New Lead") only show leads with that specific stage.
  const stageFilteredLeads =
    selectedStage === "All Customers"
      ? filteredLeads
      : filteredLeads.filter((lead) => lead.stage === selectedStage);

  // Group leads by stage for the grouped view
  const groupedLeads = stageTabs.slice(1).reduce((acc, stage) => {
    const leadsInStage = filteredLeads.filter(lead => lead.stage === stage);
    if (leadsInStage.length > 0) {
      acc[stage] = leadsInStage;
    }
    return acc;
  }, {});

  // Pagination calculations.
  const totalLeads = stageFilteredLeads.length;
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = stageFilteredLeads.slice(startIndex, endIndex);

  // Reset pagination when filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStage, searchTerm, appliedFilters, viewMode]);

  // Pagination handlers.
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  // Helper: Create a slug from full name (for mobile navigation).
  const slugify = (text) => {
    return (
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-") + "-lead"
    );
  };

  // On row click: if mobile, navigate using slug; if desktop, open the detail drawer.
  const handleRowClick = (lead) => {
    // Ensure the lead has the most up-to-date stage information
    const leadWithUpdatedStage = {
      ...lead,
      // Always use the stage from myLeadData if available
      stage: myLeadData[lead._id]?.stage || lead.stage
    };
    
    if (isMobile) {
      const slug = slugify(leadWithUpdatedStage.fullName || "unknown");
      
      // Save current state before navigating
      const currentState = {
        cachedLeads: leads,
        dataSource,
        currentPage,
        searchTerm,
        totalGoogleSheetLeads,
        selectedStage,
        filters,
        appliedFilters,
        viewMode,
        expandedStages,
        visibleLeadsCount
      };
      
      navigate(`/my-leads/${slug}`, { 
        state: { 
          lead: leadWithUpdatedStage,
          previousState: currentState
        } 
      });
    } else {
      setSelectedLead(leadWithUpdatedStage);
      setDrawerOpen(true);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedLead(null);
    
    // Reset data loaded flag to force a refresh from Firebase
    dataLoadedOnce.current = false;
    
    // First get the latest data from localStorage
    const freshLeadData = getLeadDataFromStorage();
    setMyLeadData(freshLeadData);
    
    // Apply the updated stages to the existing leads immediately
    // This provides instant feedback before the Firebase data loads
    setLeads(prevLeads => 
      prevLeads.map(lead => ({
        ...lead,
        stage: freshLeadData[lead._id]?.stage || lead.stage || "New Lead"
      }))
    );
    
    // Then fetch fresh data from Firebase
    setLoading(true);
    fetchLeads(false).finally(() => {
      setLoading(false);
    });
  };

  // Handler for stage tab clicks
  const handleStageTabClick = (stage) => {
    // Cache the current filter state and results before changing tabs
    const stateToCache = {
      cachedLeads: leads,
      dataSource,
      currentPage: 1, // Reset to page 1 when changing tabs
      searchTerm,
      selectedStage: stage,
      filters,
      appliedFilters,
      viewMode,
      expandedStages,
      visibleLeadsCount,
      totalGoogleSheetLeads
    };
    
    // Update the current stage selection
    setSelectedStage(stage);
    
    // Reset pagination when changing stage tabs
    setCurrentPage(1);
    
    // Save in location state
    navigate(".", { 
      replace: true,
      state: stateToCache
    });
  };

  // --- Filter Drawer Handlers ---
  const applyFilters = () => {
    setAppliedFilters(filters);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      customerName: "",
      address: "",
      city: "",
      workRequired: "",
      details: "",
      budget: "",
      dateAdded: "", // Clear date filter too
    };
    setFilters(cleared);
    setAppliedFilters(cleared);
    setFilterOpen(false);
  };

  // Helper: Get stage icon based on stage name
  const getStageIcon = (stage) => {
    switch (stage) {
      case "New Lead":
        return <FolderOpen fontSize="small" sx={{ color: "#4DB6AC" }} />;
      case "In Progress":
        return <HourglassEmpty fontSize="small" sx={{ color: "#F4A261" }} />;
      case "Quote Sent":
        return <Send fontSize="small" sx={{ color: "#457B9D" }} />;
      case "Completed":
        return <CheckCircle fontSize="small" sx={{ color: "#52B788" }} />;
      case "Rejected":
        return <Cancel fontSize="small" sx={{ color: "#E63946" }} />;
      case "Cancelled":
        return <Cancel fontSize="small" sx={{ color: "#E63946" }} />;
      default:
        return <Assignment fontSize="small" />;
    }
  };

  // Helper: Get stage class name for styling
  const getStageClass = (stage) => {
    const stageKey = stage.toLowerCase().replace(/\s+/g, '-');
    switch (stageKey) {
      case 'new-lead':
        return 'stage-new-lead';
      case 'in-progress':
        return 'stage-in-progress';
      case 'quote-sent':
        return 'stage-quote-sent';
      case 'completed':
        return 'stage-completed';
      case 'rejected':
      case 'cancelled':
      case 'no-answer':
        return `stage-${stageKey}`;
      default:
        return '';
    }
  };

  // Helper: Get stage indicator class
  const getStageIndicatorClass = (stage) => {
    const stageKey = stage.toLowerCase().replace(/\s+/g, '-');
    switch (stageKey) {
      case 'new-lead':
        return 'stage-new';
      case 'in-progress':
        return 'stage-progress';
      case 'quote-sent':
        return 'stage-quote';
      case 'completed':
        return 'stage-completed';
      case 'rejected':
      case 'cancelled':
      case 'no-answer':
        return 'stage-rejected';
      default:
        return '';
    }
  };

  // Function to toggle expanded state for a stage
  const toggleStageExpansion = (stage) => {
    setExpandedStages(prev => ({
      ...prev,
      [stage]: !prev[stage]
    }));
  };
  
  // Function to load more leads for a stage
  const loadMoreLeads = (stage, totalLeadsCount) => {
    setVisibleLeadsCount(prev => {
      const currentCount = prev[stage] || initialLeadsPerStage;
      const newCount = Math.min(currentCount + leadsLoadIncrement, totalLeadsCount);
      return {
        ...prev,
        [stage]: newCount
      };
    });
  };
  
  // Function to reset visible leads count when collapsing a stage
  const resetVisibleLeadsCount = (stage) => {
    setVisibleLeadsCount(prev => ({
      ...prev,
      [stage]: initialLeadsPerStage
    }));
    toggleStageExpansion(stage);
  };

  // Update the resetSync function to force a full sync
  const resetSync = useCallback(() => {
    // Clear the last sync timestamp and row ID
    localStorage.removeItem("lastGoogleFormSyncTimestamp");
    localStorage.removeItem("lastProcessedGoogleFormRowId");
    
    // Force a full sync
    syncLeads(true);
  }, [syncLeads]);

  // Render desktop table view.
  const renderDesktopTable = () => (
    <TableContainer component={Paper} className="leads-table-container">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell className="table-header">Customer Name</TableCell>
            <TableCell className="table-header">Address</TableCell>
            <TableCell className="table-header">City</TableCell>
            <TableCell className="table-header">Work Required</TableCell>
            <TableCell className="table-header">Details</TableCell>
            <TableCell className="table-header">Budget</TableCell>
            <TableCell className="table-header">Stage</TableCell>
            <TableCell className="table-header">Source</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {currentLeads.map((lead, i) => (
            <TableRow
              key={i}
              onClick={() => handleRowClick(lead)}
              hover
              style={{ cursor: "pointer" }}
            >
              <TableCell>
                <Box className="client-cell">
                  <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
                    {lead.fullName?.[0] || "N"}
                  </Avatar>
                  <Box>
                    <Typography className="client-name">
                      {lead.fullName || "Unknown Name"}
                    </Typography>
                    <Typography className="client-subtext">
                      {lead.phoneNumber}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{lead.address || "N/A"}</TableCell>
              <TableCell>{lead.city || "N/A"}</TableCell>
              <TableCell>{lead.workRequired || "N/A"}</TableCell>
              <TableCell>{truncateText(lead.details)}</TableCell>
              <TableCell>{lead.budget || "N/A"}</TableCell>
              <TableCell>
                <Chip 
                  icon={getStageIcon(lead.stage)}
                  label={lead.stage} 
                  size="small"
                  sx={{ 
                    backgroundColor: lead.stage === "New Lead" ? "#E8F5E9" :
                                    lead.stage === "In Progress" ? "#FFF3E0" :
                                    lead.stage === "Quote Sent" ? "#E1F5FE" :
                                    lead.stage === "Completed" ? "#E8F5E9" :
                                    "#FFEBEE",
                    color: lead.stage === "New Lead" ? "#2E7D32" :
                           lead.stage === "In Progress" ? "#E65100" :
                           lead.stage === "Quote Sent" ? "#0277BD" :
                           lead.stage === "Completed" ? "#2E7D32" :
                           "#C62828",
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: 'inherit'
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                {lead.googleFormSubmission ? (
                  <Tooltip title="From Google Form">
                    <Chip 
                      size="small" 
                      label="Google Form" 
                      color="primary" 
                      variant="outlined" 
                      sx={{ fontSize: '0.7rem' }} 
                    />
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Manual Entry
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render mobile card view.
  const renderMobileCards = () => (
    <Box className="mobile-cards-container">
      {currentLeads.map((lead, i) => (
        <Box 
          key={i} 
          className={`mobile-lead-card ${getStageClass(lead.stage)}`} 
          onClick={() => handleRowClick(lead)}
        >
          <Box className="card-header">
            <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
              {lead.fullName?.[0] || "N"}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography className="client-name">
                {lead.fullName || "Unknown Name"}
              </Typography>
              <Typography className="client-subtext">
                {lead.phoneNumber}
              </Typography>
            </Box>
            {lead.googleFormSubmission && (
              <Chip 
                size="small" 
                label="Form" 
                color="primary" 
                variant="outlined" 
                sx={{ fontSize: '0.7rem', height: 24 }} 
              />
            )}
          </Box>
          <Box className="card-content">
            <Typography variant="body2">
              <strong>Address:</strong> {lead.address || "N/A"}
            </Typography>
            <Typography variant="body2">
              <strong>City:</strong> {lead.city || "N/A"}
            </Typography>
            <Typography variant="body2">
              <strong>Work:</strong> {lead.workRequired || "N/A"}
            </Typography>
            {lead.details && (
              <Typography variant="body2">
                <strong>Details:</strong> {truncateText(lead.details, 15)}
              </Typography>
            )}
          </Box>
          <Box className="card-footer">
            <Chip 
              icon={getStageIcon(lead.stage)}
              label={lead.stage} 
              size="small"
              sx={{ 
                backgroundColor: lead.stage === "New Lead" ? "#E8F5E9" :
                                lead.stage === "In Progress" ? "#FFF3E0" :
                                lead.stage === "Quote Sent" ? "#E1F5FE" :
                                lead.stage === "Completed" ? "#E8F5E9" :
                                "#FFEBEE",
                color: lead.stage === "New Lead" ? "#2E7D32" :
                       lead.stage === "In Progress" ? "#E65100" :
                       lead.stage === "Quote Sent" ? "#0277BD" :
                       lead.stage === "Completed" ? "#2E7D32" :
                       "#C62828",
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: 'inherit'
                }
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );

  // Render grouped view (desktop and mobile)
  const renderGroupedView = () => (
    <>
      {Object.keys(groupedLeads).length === 0 ? (
        <Box className="empty-state">
          <FolderOpen className="empty-state-icon" />
          <Typography className="empty-state-title">No leads found</Typography>
          <Typography className="empty-state-text">
            There are no leads matching your current filters. Try adjusting your search criteria.
          </Typography>
        </Box>
      ) : (
        Object.entries(groupedLeads).map(([stage, stageLeads]) => {
          // Determine if this stage is expanded
          const isExpanded = expandedStages[stage] || false;
          
          // Get the number of leads to display
          const currentVisibleCount = visibleLeadsCount[stage] || initialLeadsPerStage;
          
          // Get the leads to display (either initial count or expanded count)
          const displayLeads = isExpanded 
            ? stageLeads.slice(0, currentVisibleCount) 
            : stageLeads.slice(0, initialLeadsPerStage);
          
          // Check if we need to show the "Load More" button
          const hasMoreLeads = stageLeads.length > initialLeadsPerStage;
          
          // Check if there are more leads to load
          const hasMoreToLoad = isExpanded && currentVisibleCount < stageLeads.length;
          
          return (
            <Box key={stage}>
              <Box className="stage-group-header">
                <span className={`stage-indicator ${getStageIndicatorClass(stage)}`}></span>
                {stage}
                <span className="stage-group-count">{stageLeads.length}</span>
              </Box>
              
              {isMobile ? (
                <>
                  <Box className="mobile-cards-container">
                    {displayLeads.map((lead, i) => (
                      <Box 
                        key={i} 
                        className={`mobile-lead-card ${getStageClass(lead.stage)}`} 
                        onClick={() => handleRowClick(lead)}
                      >
                        <Box className="card-header">
                          <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
                            {lead.fullName?.[0] || "N"}
                          </Avatar>
                          <Box>
                            <Typography className="client-name">
                              {lead.fullName || "Unknown Name"}
                            </Typography>
                            <Typography className="client-subtext">
                              {lead.phoneNumber}
                            </Typography>
                          </Box>
                        </Box>
                        <Box className="card-content">
                          <Typography variant="body2">
                            <strong>Address:</strong> {lead.address || "N/A"}
                          </Typography>
                          <Typography variant="body2">
                            <strong>City:</strong> {lead.city || "N/A"}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Work Required:</strong> {lead.workRequired || "N/A"}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Budget:</strong> {lead.budget || "N/A"}
                          </Typography>
                          {lead.details && (
                            <Typography variant="body2">
                              <strong>Details:</strong> {truncateText(lead.details, 15)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  {hasMoreLeads && (
                    <Box className="load-more-container">
                      {!isExpanded ? (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => toggleStageExpansion(stage)}
                        >
                          Show More ({stageLeads.length - initialLeadsPerStage})
                        </Button>
                      ) : hasMoreToLoad ? (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => loadMoreLeads(stage, stageLeads.length)}
                        >
                          Load 5 More ({stageLeads.length - currentVisibleCount} remaining)
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => resetVisibleLeadsCount(stage)}
                        >
                          Show Less
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <TableContainer component={Paper} className="leads-table-container">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell className="table-header">Customer Name</TableCell>
                          <TableCell className="table-header">Address</TableCell>
                          <TableCell className="table-header">City</TableCell>
                          <TableCell className="table-header">Work Required</TableCell>
                          <TableCell className="table-header">Details</TableCell>
                          <TableCell className="table-header">Budget</TableCell>
                          <TableCell className="table-header">Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayLeads.map((lead, i) => (
                          <TableRow
                            key={i}
                            onClick={() => handleRowClick(lead)}
                            hover
                            style={{ cursor: "pointer" }}
                          >
                            <TableCell>
                              <Box className="client-cell">
                                <Avatar sx={{ bgcolor: "#2A9D8F" }} className="lead-avatar">
                                  {lead.fullName?.[0] || "N"}
                                </Avatar>
                                <Box>
                                  <Typography className="client-name">
                                    {lead.fullName || "Unknown Name"}
                                  </Typography>
                                  <Typography className="client-subtext">
                                    {lead.phoneNumber}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{lead.address || "N/A"}</TableCell>
                            <TableCell>{lead.city || "N/A"}</TableCell>
                            <TableCell>{lead.workRequired || "N/A"}</TableCell>
                            <TableCell>{truncateText(lead.details)}</TableCell>
                            <TableCell>{lead.budget || "N/A"}</TableCell>
                            <TableCell>
                              {lead.googleFormSubmission ? (
                                <Tooltip title="From Google Form">
                                  <Chip 
                                    size="small" 
                                    label="Google Form" 
                                    color="primary" 
                                    variant="outlined" 
                                    sx={{ fontSize: '0.7rem' }} 
                                  />
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="textSecondary">
                                  Manual Entry
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {hasMoreLeads && (
                    <Box className="load-more-container">
                      {!isExpanded ? (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => toggleStageExpansion(stage)}
                        >
                          Show More ({stageLeads.length - initialLeadsPerStage})
                        </Button>
                      ) : hasMoreToLoad ? (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => loadMoreLeads(stage, stageLeads.length)}
                        >
                          Load 5 More ({stageLeads.length - currentVisibleCount} remaining)
                        </Button>
                      ) : (
                        <Button 
                          variant="outlined" 
                          className="load-more-button"
                          onClick={() => resetVisibleLeadsCount(stage)}
                        >
                          Show Less
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              )}
            </Box>
          );
        })
      )}
    </>
  );

  // Fetch leads on component mount
  useEffect(() => {
    // Always refresh leads data when component mounts
    // This ensures changes made in lead detail views are reflected here
    setLoading(true);
    dataLoadedOnce.current = false;
    
    fetchLeads(false)
      .catch(err => {
        console.error("Error fetching leads:", err);
        setError("Failed to fetch leads. Please try again.");
        setLoading(false);
      })
      .finally(() => {
        // Ensure loading state is turned off even if there's an error
        setLoading(false);
      });
    
    return () => {
      isMounted.current = false;
      
      // Cleanup auto-sync interval
      // Capture the current interval ID to avoid issues with stale refs
      const intervalId = autoSyncIntervalRef.current;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchLeads]);

  // Add a new effect to synchronize stage data
  useEffect(() => {
    // Only run this if we have both leads and myLeadData
    if (leads.length > 0 && Object.keys(myLeadData).length > 0) {
      // Check if any lead stages need updating from myLeadData
      let hasChanges = false;
      const updatedLeads = leads.map(lead => {
        const storedData = myLeadData[lead._id];
        if (storedData && storedData.stage && storedData.stage !== lead.stage) {
          hasChanges = true;
          return { ...lead, stage: storedData.stage };
        }
        return lead;
      });
      
      // Only update if there were actual changes
      if (hasChanges) {
        console.log('Syncing leads with latest stage data from myLeadData');
        setLeads(updatedLeads);
      }
    }
  }, [leads, myLeadData]);

  // Listen for lead stage updates from the drawer
  useEffect(() => {
    const handleLeadStageUpdate = (event) => {
      const { leadId, newStage } = event.detail;
      console.log(`Lead stage updated: ${leadId} -> ${newStage}`);
      
      // Update the leads array directly with the new stage
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead._id === leadId 
            ? { ...lead, stage: newStage } 
            : lead
        )
      );
      
      // Also refresh the myLeadData to ensure it's in sync
      setMyLeadData(getLeadDataFromStorage());
    };
    
    // Add event listener
    window.addEventListener('leadStageUpdated', handleLeadStageUpdate);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('leadStageUpdated', handleLeadStageUpdate);
    };
  }, []);

  if (loading) {
    return (
      <Box className="myLeads-loading-container">
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box className="myLeads-error-container">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box className="myLeads-container">
      <Typography variant="h5" className="section-title">
        {userRole === "admin" ? "All Leads" : `${auth.currentUser?.displayName || 'Builder'}'s Leads`}
      </Typography>
      <Typography variant="subtitle2" className="section-subtitle">
        {userRole === "admin" 
          ? `View and manage all leads in the system. Data source: ${dataSource === "firebase" ? "Firebase" : "Google Sheets"}.` 
          : "View all of your leads."}
      </Typography>

      {/* Stage Filter Tabs – horizontal scroll */}
      <Box
        className="tabs-container"
        sx={{
          overflowX: "auto",
          whiteSpace: "nowrap",
          flexWrap: "nowrap",
        }}
      >
        {stageTabs.map((stage) => {
          // Determine the count to display
          let count;
          const isAdmin = userRole?.isAdmin || userRole === "admin";
          
          if (stage === "All Customers") {
            if (isAdmin && totalGoogleSheetLeads > 0) {
              count = totalGoogleSheetLeads;
            } else {
              count = combinedLeads.length;
            }
          } else {
            count = combinedLeads.filter((lead) => lead.stage === stage).length;
          }
          
          return (
            <div
              key={stage}
              className={`tab-item ${selectedStage === stage ? "active" : ""}`}
              onClick={() => handleStageTabClick(stage)}
              style={{ flexShrink: 0 }}
            >
              {stage !== "All Customers" && (
                <span className={`stage-indicator ${getStageIndicatorClass(stage)}`}></span>
              )}
              {stage}{" "}
              <span>
                {count}
              </span>
            </div>
          );
        })}
      </Box>

      {/* Search & Filter Row */}
      <Box className="actions-row">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search for Clients"
          InputProps={{
            startAdornment: <Search className="search-icon" />,
          }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-field"
        />
        <div className="action-buttons">
          {(userRole === "admin" || userRole?.role === "admin" || userRole?.isAdmin === true) && (
            <>
              {/* New Leads Button with Badge */}
              <div className="sync-buttons-container">
                <Tooltip title="Check for new leads">
                  <Badge 
                    badgeContent={newLeadsCount} 
                    color="error"
                    invisible={!newLeadsAlert}
                    className="new-leads-badge"
                  >
                    <Button 
                      variant="outlined" 
                      startIcon={newLeadsAlert ? <NotificationsActive /> : <Notifications />}
                      onClick={() => fetchNewLeads(true)}
                      disabled={syncingForms}
                      color={newLeadsAlert ? "error" : "primary"}
                    >
                      {syncingForms ? "Checking..." : "New Leads"}
                    </Button>
                  </Badge>
                </Tooltip>
                
                {/* Auto-sync Toggle */}
                <Tooltip title={autoSyncEnabled ? "Disable auto-sync" : "Enable auto-sync"}>
                  <Button 
                    variant={autoSyncEnabled ? "contained" : "outlined"}
                    onClick={toggleAutoSync}
                    className={`auto-sync-button ${autoSyncEnabled ? 'enabled' : ''}`}
                    size="small"
                  >
                    {autoSyncEnabled ? "Auto-Sync ON" : "Auto-Sync OFF"}
                  </Button>
                </Tooltip>
                
                {/* Full Sync Button */}
                <Tooltip title="Sync all Google Form submissions">
                  <Button 
                    variant="outlined" 
                    startIcon={<Sync />} 
                    onClick={() => syncLeads(true)}
                    disabled={syncingForms}
                    className="full-sync-button"
                  >
                    {syncingForms ? "Syncing..." : "Full Sync"}
                  </Button>
                </Tooltip>
                
                {/* Reset Sync Button */}
                <Tooltip title="Reset sync state to force a full resync">
                  <Button 
                    variant="outlined" 
                    color="warning"
                    onClick={resetSync}
                    className="reset-sync-button"
                    size="small"
                  >
                    Reset Sync
                  </Button>
                </Tooltip>
              </div>
            </>
          )}
          <Button 
            variant="outlined" 
            startIcon={<SortByAlpha />} 
            onClick={() => setViewMode(viewMode === "list" ? "grouped" : "list")}
          >
            {viewMode === "list" ? "Group by Stage" : "List View"}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<FilterList />} 
            onClick={() => setFilterOpen(true)}
          >
            Filters
          </Button>
        </div>
      </Box>

      {/* New Leads Alert */}
      {newLeadsAlert && (
        <Alert 
          severity="info" 
          onClose={clearNewLeadsNotification}
          sx={{ mb: 2 }}
          className="new-leads-alert"
        >
          {newLeadsCount} new lead{newLeadsCount !== 1 ? 's' : ''} found! These leads have been automatically synced.
        </Alert>
      )}

      {/* Active Filter Heading */}
      {appliedFilters.dateAdded && (
        <Box className="active-filter-heading">
          <CalendarToday fontSize="small" sx={{ color: '#2A9D8F', mr: 1 }} />
          <Typography variant="h6">
            {dateFilterOptions.find(option => option.value === appliedFilters.dateAdded)?.label || 'Filtered Leads'}
            <span className="filter-count">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            size="small" 
            onClick={() => {
              setFilters({...filters, dateAdded: ''});
              setAppliedFilters({...appliedFilters, dateAdded: ''});
            }}
            startIcon={<Cancel fontSize="small" />}
            className="clear-filter-button"
          >
            Clear Filter
          </Button>
        </Box>
      )}

      {/* Render leads based on view mode */}
      {viewMode === "grouped" ? (
        renderGroupedView()
      ) : (
        isMobile ? renderMobileCards() : renderDesktopTable()
      )}

      {/* Pagination Controls - only show in list view */}
      {viewMode === "list" && (
        <Box className="pagination-controls">
          <IconButton onClick={handlePrev} disabled={currentPage === 1} className="pagination-arrow">
            <ArrowBack />
          </IconButton>
          <Typography className="pagination-info">
            Page {currentPage} of {totalPages || 1}
          </Typography>
          <IconButton onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="pagination-arrow">
            <ArrowForward />
          </IconButton>
        </Box>
      )}

      {/* For desktop, show the detail drawer */}
      {!isMobile && (
        <LeadDetailDrawer open={drawerOpen} onClose={handleDrawerClose} lead={selectedLead} />
      )}

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        PaperProps={{ sx: { width: "300px" } }}
      >
        <Box className="filter-drawer">
          <Typography variant="h6" className="filter-title">
            Filters
          </Typography>

          {(userRole === "admin" || userRole?.role === "admin" || userRole?.isAdmin === true) && (
            <Box className="admin-note" sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(42, 157, 143, 0.1)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: '#2A9D8F', fontWeight: 500 }}>
                Admin View: You are seeing leads from all builders in the system. 
                Data source: {dataSource === "firebase" ? "Firebase" : "Google Sheets"}.
              </Typography>
            </Box>
          )}

          {/* Date Added Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-date-label">Date Added</InputLabel>
            <Select
              labelId="filter-date-label"
              value={filters.dateAdded}
              label="Date Added"
              onChange={(e) =>
                setFilters({ ...filters, dateAdded: e.target.value })
              }
              startAdornment={
                <CalendarToday fontSize="small" sx={{ mr: 1, color: '#2A9D8F' }} />
              }
            >
              {dateFilterOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Filter leads by when they were added
            </FormHelperText>
          </FormControl>

          {/* City Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-city-label">City</InputLabel>
            <Select
              labelId="filter-city-label"
              value={filters.city}
              label="City"
              onChange={(e) =>
                setFilters({ ...filters, city: e.target.value })
              }
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {cityOptions.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Budget Filter */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="filter-budget-label">Budget</InputLabel>
            <Select
              labelId="filter-budget-label"
              value={filters.budget}
              label="Budget"
              onChange={(e) =>
                setFilters({ ...filters, budget: e.target.value })
              }
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {budgetOptions.map((budget) => (
                <MenuItem key={budget} value={budget}>
                  {budget}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action buttons */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button variant="outlined" className="filter-button outlined" onClick={clearFilters}>
              Clear
            </Button>
            <Button variant="contained" className="filter-button" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Snackbar for sync messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={syncMessage}
      />
    </Box>
  );
};
export default MyLeads;


