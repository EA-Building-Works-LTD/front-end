// src/LeadDetailMobile.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Button,
  useMediaQuery,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  BottomNavigation,
  BottomNavigationAction,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import CircleIcon from "@mui/icons-material/Circle";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import NoteIcon from "@mui/icons-material/Note";
import DescriptionIcon from "@mui/icons-material/Description";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ImageIcon from "@mui/icons-material/Image";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import GetAppIcon from '@mui/icons-material/GetApp';
import InfoIcon from '@mui/icons-material/Info';
import PoundSterlingIcon from '../Icons/PoundSterlingIcon';

// Utilities & ephemeral state hook
import { formatTimestamp } from "../../utils/dateUtils";
import { formatWithCommas } from "../../utils/dateUtils";
import { v4 as uuidv4 } from "uuid";
import useFirebaseState from "../../hooks/useFirebaseState";
import { auth } from "../../firebase/config";
import { updateLead, getLeadById } from "../../firebase/leads";

// Components (same functionality as desktop)
import NotesSection from './NotesSection';
import StageModal from '../Modals/StageModal';
import AppointmentModal from '../Appointments/AppointmentModal';
import ContractModal from '../Modals/ContractModal';
import ProposalModal from '../Modals/ProposalModal';

// CSS
import "./LeadDetailMobile.css";

// Helper: Create an activity log entry
function createActivity(title, subtext) {
  // Ensure we always have a valid timestamp
  const timestamp = Date.now();
  
  return { 
    id: uuidv4(), 
    timestamp: timestamp, 
    title, 
    subtext 
  };
}

export default function LeadDetailMobile() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  // Lead data from Firebase
  const [allLeadData, setAllLeadData] = useFirebaseState(
    "leadData",
    auth.currentUser?.uid || "anonymous",
    "myLeadData",
    {}
  );

  // Local UI state
  const [activeTab, setActiveTab] = useState(0);
  const [openContractModal, setOpenContractModal] = useState(false);
  const [openDateModal, setOpenDateModal] = useState(false);
  const [openStageModal, setOpenStageModal] = useState(false);
  const [openProposalModal, setOpenProposalModal] = useState(false);
  const [tempProposal, setTempProposal] = useState(null);
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);
  const [anchorElAppt, setAnchorElAppt] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [mediaType, setMediaType] = useState("before"); // "before", "after", or "documents"
  const fileInputRef = React.useRef(null);
  const [viewImageModal, setViewImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageZoom, setImageZoom] = useState(1);
  const [touchPosition, setTouchPosition] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Add these refs after the other state declarations
  const activityTabRef = React.useRef(null);
  const appointmentsTabRef = React.useRef(null);
  const proposalsTabRef = React.useRef(null);
  const notesTabRef = React.useRef(null);
  const mediaTabRef = React.useRef(null);

  // Retrieve lead from router state
  const lead = location.state?.lead;
  const previousState = location.state?.previousState;
  const hasLead = Boolean(lead);

  // Add debugging
  useEffect(() => {
    if (hasLead) {
      // console.log("Lead data from router state:", lead);
    }
  }, [hasLead, lead]);

  // Add debugging for leadObj
  useEffect(() => {
    if (hasLead && lead._id) {
      // console.log("Lead object from allLeadData:", allLeadData[lead._id]);
    }
  }, [hasLead, lead, allLeadData]);

  // If screen is desktop, redirect
  useEffect(() => {
    if (isDesktop) {
      navigate("/my-leads", { 
        replace: true,
        state: previousState
      });
    }
  }, [isDesktop, navigate, previousState]);

  // Initialize ephemeral data if not present
  useEffect(() => {
    if (hasLead && lead._id) {
      // Check if we already have data for this lead
      if (!allLeadData[lead._id]) {
        // First check if the lead exists in Firebase
        getLeadById(lead._id)
          .then(firebaseLead => {
            if (firebaseLead) {
              // If the lead exists in Firebase, use that data
              // console.log("Found lead in Firebase, using that data");
              setAllLeadData(prev => ({
                ...prev,
                [lead._id]: {
                  ...firebaseLead,
                  // Ensure media object exists
                  media: firebaseLead.media || { before: [], after: [], documents: [] }
                }
              }));
            } else {
              // If the lead doesn't exist in Firebase, create a new one
              // console.log("Lead not found in Firebase, creating new lead");
              const initialLeadObj = {
                // Include any fields that might already be in the lead object
                ...lead,
                // Then set the required fields with fallbacks
                contractAmount: lead.contractAmount || "",
                profit: lead.profit || "",
                stage: lead.stage || "New Lead",
                customerName: lead.fullName || "",
                address: lead.address || "",
                builderName: lead.builder || "",
                // Use startDate as email if it's a valid email, otherwise use email field
                email: (lead.startDate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.startDate)) 
                  ? lead.startDate 
                  : (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) 
                    ? lead.email 
                    : "",
                phoneNumber: lead.phoneNumber || "",
                city: lead.city || "",
                workRequired: lead.workRequired || "No Enquiry",
                details: lead.details || "",
                appointmentDate: lead.appointmentDate || null,
                notes: lead.notes || [],
                proposals: lead.proposals || [],
                media: lead.media || { before: [], after: [], documents: [] },
                // Ensure timestamp is valid - handle Firestore timestamp objects
                timestamp: lead.timestamp && typeof lead.timestamp === 'object' && lead.timestamp.seconds
                  ? new Date(lead.timestamp.seconds * 1000).getTime()
                  : lead.timestamp && !isNaN(new Date(lead.timestamp).getTime()) 
                    ? lead.timestamp 
                    : Date.now(),
                activities: lead.activities || [
                  createActivity(
                    `Stage: New Lead added for ${lead.builder || "unknown"}`,
                    `Lead has been submitted on ${formatTimestamp(
                      lead.timestamp && typeof lead.timestamp === 'object' && lead.timestamp.seconds
                        ? new Date(lead.timestamp.seconds * 1000)
                        : lead.timestamp && !isNaN(new Date(lead.timestamp).getTime())
                          ? lead.timestamp
                          : Date.now()
                    )}`
                  ),
                ],
              };
              
              setAllLeadData(prev => ({ ...prev, [lead._id]: initialLeadObj }));
              
              // Also ensure the data is saved to Firebase to avoid data loss
              updateLead(lead._id, initialLeadObj).catch(err => {
                // console.error("Error saving initial lead data to Firebase:", err);
              });
            }
          })
          .catch(err => {
            // console.error("Error checking if lead exists in Firebase:", err);
            
            // Fallback to creating a new lead if there's an error
            const initialLeadObj = {
              ...lead,
              contractAmount: lead.contractAmount || "",
              profit: lead.profit || "",
              stage: lead.stage || "New Lead",
              customerName: lead.fullName || "",
              address: lead.address || "",
              builderName: lead.builder || "",
              // Use startDate as email if it's a valid email, otherwise use email field
              email: (lead.startDate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.startDate)) 
                ? lead.startDate 
                : (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) 
                  ? lead.email 
                  : "",
              phoneNumber: lead.phoneNumber || "",
              city: lead.city || "",
              workRequired: lead.workRequired || "No Enquiry",
              details: lead.details || "",
              appointmentDate: lead.appointmentDate || null,
              notes: lead.notes || [],
              proposals: lead.proposals || [],
              media: lead.media || { before: [], after: [], documents: [] },
              // Ensure timestamp is valid - handle Firestore timestamp objects
              timestamp: lead.timestamp && typeof lead.timestamp === 'object' && lead.timestamp.seconds
                ? new Date(lead.timestamp.seconds * 1000).getTime()
                : lead.timestamp && !isNaN(new Date(lead.timestamp).getTime()) 
                  ? lead.timestamp 
                  : Date.now(),
              activities: lead.activities || [
                createActivity(
                  `Stage: New Lead added for ${lead.builder || "unknown"}`,
                  `Lead has been submitted on ${formatTimestamp(
                    lead.timestamp && typeof lead.timestamp === 'object' && lead.timestamp.seconds
                      ? new Date(lead.timestamp.seconds * 1000)
                      : lead.timestamp && !isNaN(new Date(lead.timestamp).getTime())
                        ? lead.timestamp
                        : Date.now()
                  )}`
                ),
              ],
            };
            
            setAllLeadData(prev => ({ ...prev, [lead._id]: initialLeadObj }));
            
            // Also ensure the data is saved to Firebase to avoid data loss
            updateLead(lead._id, initialLeadObj).catch(err => {
              // console.error("Error saving initial lead data to Firebase:", err);
            });
          });
      }
    }
  }, [hasLead, lead, allLeadData, setAllLeadData]);

  // The ephemeral lead object
  const leadObj = hasLead ? allLeadData[lead._id] || {} : {};

  // Check for online/offline status
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Scroll to active stage when component loads
  useEffect(() => {
    const scrollContainer = document.querySelector('.pipeline-steps-scroll-container');
    const activeStage = document.querySelector('.pipeline-step.active');
    
    if (scrollContainer && activeStage) {
      // Calculate the scroll position to center the active stage
      const containerWidth = scrollContainer.offsetWidth;
      const activeStageLeft = activeStage.offsetLeft;
      const activeStageWidth = activeStage.offsetWidth;
      
      const scrollPosition = activeStageLeft - (containerWidth / 2) + (activeStageWidth / 2);
      
      // Smooth scroll to the position
      scrollContainer.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [leadObj.stage]);

  // Update file input accept attribute based on mediaType
  useEffect(() => {
    if (fileInputRef && fileInputRef.current) {
      if (mediaType === "documents") {
        fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.txt";
      } else {
        fileInputRef.current.accept = "image/*";
      }
    }
  }, [mediaType]);

  // Add debugging for lead data
  useEffect(() => {
    if (hasLead && lead._id && allLeadData[lead._id]) {
      // console.log("Lead data updated:", allLeadData[lead._id]);
      // console.log("Notes:", allLeadData[lead._id].notes || []);
    }
  }, [hasLead, lead, allLeadData]);

  // -------------------- UPDATE HELPERS (same as desktop) --------------------
  function updateLeadData(changes) {
    // console.log("Updating lead data with changes:", changes);
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      let updatedActivities = oldData.activities || [];

      if ("stage" in changes && changes.stage !== oldData.stage) {
        updatedActivities = [
          ...updatedActivities,
          createActivity(
            `Stage: ${oldData.stage} → ${changes.stage}`,
            `Lead has been moved to the ${changes.stage} stage.`
          ),
        ];
        
        // Add stageManuallySet flag when stage is manually changed
        changes.stageManuallySet = true;
      }
      if ("contractAmount" in changes && changes.contractAmount !== oldData.contractAmount) {
        updatedActivities = [
          ...updatedActivities,
          createActivity(
            "Contract Amount Updated",
            `Contract changed from £${oldData.contractAmount || "0"} to £${changes.contractAmount}`
          ),
        ];
      }
      if ("profit" in changes && changes.profit !== oldData.profit) {
        updatedActivities = [
          ...updatedActivities,
          createActivity(
            "Profit Updated",
            `Profit changed from £${oldData.profit || "0"} to £${changes.profit}`
          ),
        ];
      }
      if ("appointmentDate" in changes && changes.appointmentDate !== oldData.appointmentDate) {
        if (!changes.appointmentDate && oldData.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            createActivity("Appointment Deleted", "User removed the appointment date/time."),
          ];
        } else if (!oldData.appointmentDate && changes.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            createActivity(
              "Appointment Created",
              `Appointment set on ${formatTimestamp(changes.appointmentDate)}`
            ),
          ];
        } else if (oldData.appointmentDate && changes.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            createActivity(
              "Appointment Updated",
              `Appointment changed from ${formatTimestamp(oldData.appointmentDate)} to ${formatTimestamp(changes.appointmentDate)}`
            ),
          ];
        }
      }
      
      // Create the updated lead object with all changes
      const updatedLead = { ...oldData, ...changes, activities: updatedActivities };
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        ...changes,
        activities: updatedActivities
      }).catch(err => {
        // console.error("Error saving changes to Firebase:", err);
      });
      
      const updatedData = {
        ...prev,
        [lead._id]: updatedLead,
      };
      // console.log("Updated lead data:", updatedData[lead._id]);
      return updatedData;
    });
  }

  function addProposalToLead(proposal) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldProposals = oldData.proposals || [];
      const oldActivities = oldData.activities || [];

      const newActivities = [
        ...oldActivities,
        createActivity(
          "Proposal Created",
          `Proposal #${proposal.proposalNumber} was created.`
        ),
      ];
      
      const updatedProposals = [...oldProposals, proposal];
      
      // Create the updated lead object
      const updatedLead = { 
        ...oldData, 
        proposals: updatedProposals, 
        activities: newActivities 
      };
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        proposals: updatedProposals,
        activities: newActivities
      }).catch(err => {
        // console.error("Error saving proposal to Firebase:", err);
      });
      
      return {
        ...prev,
        [lead._id]: updatedLead,
      };
    });
  }

  function updateProposalStatus(proposalId, newStatus) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldProposals = oldData.proposals || [];
      const oldActivities = oldData.activities || [];
      const updatedProposals = oldProposals.map((p) => {
        if (p.id === proposalId) {
          const act = createActivity(
            "Proposal Status Updated",
            `Proposal #${p.proposalNumber} changed status from ${p.status} to ${newStatus}`
          );
          oldActivities.push(act);
          
          // Update dateAccepted based on the new status
          let dateAccepted = p.dateAccepted;
          if (newStatus === "Completed") {
            dateAccepted = Date.now(); // Set to current date if completed
          } else if (newStatus === "Pending") {
            dateAccepted = null; // Set to null if pending
          }
          
          return { ...p, status: newStatus, dateAccepted };
        }
        return p;
      });
      
      // Create the updated lead object
      const updatedLead = { 
        ...oldData, 
        proposals: updatedProposals, 
        activities: oldActivities 
      };
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        proposals: updatedProposals,
        activities: oldActivities
      }).catch(err => {
        // console.error("Error saving proposal status to Firebase:", err);
      });
      
      return {
        ...prev,
        [lead._id]: updatedLead,
      };
    });
  }

  function handleAddNote(noteContent) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldNotes = oldData.notes || [];
      const oldActivities = oldData.activities || [];
      
      // Create the note object
      const noteObj = {
        id: uuidv4(),
        content: noteContent,
        timestamp: Date.now(),
      };
      
      // Create an activity for the note
      const noteActivity = createActivity(
        "Note Added",
        `User added a note: "${noteContent}"`
      );
      
      const updatedNotes = [...oldNotes, noteObj];
      // console.log("Updated notes:", updatedNotes);
      
      // Create the updated lead object
      const updatedLead = { 
        ...oldData, 
        notes: updatedNotes, 
        activities: [...oldActivities, noteActivity] 
      };
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        notes: updatedNotes,
        activities: updatedLead.activities
      }).catch(err => {
        // console.error("Error saving note to Firebase:", err);
      });
      
      return {
        ...prev,
        [lead._id]: updatedLead,
      };
    });
  }

  // Delete a proposal
  function handleDeleteProposal(proposalId) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldProposals = oldData.proposals || [];
      const oldActivities = oldData.activities || [];
      
      // Find the proposal to be deleted for the activity log
      const proposalToDelete = oldProposals.find(p => p.id === proposalId);
      
      // Filter out the proposal with the given ID
      const updatedProposals = oldProposals.filter(p => p.id !== proposalId);
      
      // Create an activity log entry
      const deleteActivity = createActivity(
        "Proposal Deleted",
        `Proposal #${proposalToDelete?.proposalNumber || 'unknown'} was deleted.`
      );
      
      // Create the updated lead object
      const updatedActivities = [...oldActivities, deleteActivity];
      const updatedLead = { 
        ...oldData, 
        proposals: updatedProposals, 
        activities: updatedActivities
      };
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        proposals: updatedProposals,
        activities: updatedActivities
      }).catch(err => {
        // console.error("Error saving proposal deletion to Firebase:", err);
      });
      
      return {
        ...prev,
        [lead._id]: updatedLead,
      };
    });
  }

  // -------------------- UI ACTION HANDLERS --------------------
  // Contract
  const handleOpenContractModal = () => setOpenContractModal(true);
  const handleCloseContractModal = () => setOpenContractModal(false);
  const handleSaveContract = (newName, newContract, newProfit) => {
    const finalAmount = newContract ? formatWithCommas(newContract) : "0";
    const finalProfit = newProfit ? formatWithCommas(newProfit) : "0";
    updateLeadData({ 
      contractAmount: finalAmount, 
      customerName: newName,
      profit: finalProfit
    });
    setOpenContractModal(false);
  };

  // Appointment
  const handleOpenDateModal = () => {
    setOpenDateModal(true);
  };
  const handleCloseDateModal = () => {
    setOpenDateModal(false);
  };
  const handleSaveAppointment = (date) => {
    // Ensure we're working with a valid timestamp
    try {
      let validDate;
      
      // Handle Firestore timestamp objects (with seconds and nanoseconds)
      if (date && typeof date === 'object' && 'seconds' in date) {
        validDate = date.seconds * 1000; // Convert to milliseconds
      } else if (date && !isNaN(new Date(date).getTime())) {
        // Regular date object or timestamp
        validDate = date;
      } else {
        throw new Error("Invalid date format");
      }
      
      // console.log("Saving valid appointment date:", validDate);
      updateLeadData({ appointmentDate: validDate });
    } catch (error) {
      //  console.error("Invalid appointment date:", date, error);
    }
    setOpenDateModal(false);
  };

  // Stage
  const handleOpenStageModal = () => {
    setOpenStageModal(true);
  };
  const handleCloseStageModal = () => setOpenStageModal(false);
  const handleSaveStage = (stage) => {
    updateLeadData({ stage });
    setOpenStageModal(false);
  };

  // Proposal
  const handleOpenProposalModal = () => {
    // Generate proposal number from last 5 digits of phone number or random if not available
    let proposalNumber;
    if (lead.phoneNumber && lead.phoneNumber.length >= 5) {
      proposalNumber = lead.phoneNumber.slice(-5);
    } else {
      proposalNumber = Math.floor(100000 + Math.random() * 900000).toString().slice(0, 5);
    }
    
    setTempProposal({
      id: Date.now(),
      proposalNumber: proposalNumber,
      inquiryTitle: lead.workRequired || leadObj.workRequired || "No Enquiry",
      dateSent: Date.now(),
      dateAccepted: null, // Initially null
      status: "Pending",
      amount: leadObj.contractAmount || lead.contractAmount || "0",
    });
    setOpenProposalModal(true);
  };
  const handleCloseProposalModal = () => setOpenProposalModal(false);
  const handleSaveProposal = (proposal) => {
    addProposalToLead(proposal);
    setOpenProposalModal(false);
  };

  // Proposal 3-dot menu
  const handleProposalMenuOpen = (e, proposal) => {
    setProposalMenuAnchor(e.currentTarget);
    setProposalMenuTarget(proposal);
  };
  const handleProposalMenuClose = () => {
    setProposalMenuAnchor(null);
    setProposalMenuTarget(null);
  };
  const handleProposalStatusChange = (newStatus) => {
    if (!proposalMenuTarget) return;
    updateProposalStatus(proposalMenuTarget.id, newStatus);
    handleProposalMenuClose();
  };

  // Appointment 3-dot menu
  const confirmDeleteAppointment = () => {
    updateLeadData({ appointmentDate: null });
    setOpenDeleteDialog(false);
  };
  const cancelDeleteAppointment = () => {
    setOpenDeleteDialog(false);
  };

  // Tab change
  const handleTabChange = (event, newValue) => {
    // First set the active tab
    setActiveTab(newValue);
    
    // Use multiple approaches to ensure scrolling works on all devices
    setTimeout(() => {
      // Map of tab indices to element IDs
      const tabIds = [
        'activity-tab-content',
        'appointments-tab-content',
        'proposals-tab-content',
        'notes-tab-content',
        'media-tab-content'
      ];
      
      const targetId = tabIds[newValue];
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Try to find the scroll indicator within the target element
        const scrollIndicator = targetElement.querySelector('.scroll-indicator');
        const elementToScroll = scrollIndicator || targetElement;
        
        // Get the header height to offset the scroll
        const headerHeight = 120; // Increased height to ensure visibility
        
        // Approach 1: Use scrollIntoView with offset
        try {
          // First scroll to top to ensure consistent behavior
          window.scrollTo(0, 0);
          
          // Then scroll to the element
          const elementPosition = elementToScroll.getBoundingClientRect().top;
          window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'auto' // Use 'auto' instead of 'smooth' for more reliable behavior
          });
        } catch (error) {
          // console.error("Scroll approach 1 failed:", error);
        }
        
        // Approach 2: Use scrollIntoView directly
        setTimeout(() => {
          try {
            // Create a temporary style to adjust scroll margin
            const style = document.createElement('style');
            style.innerHTML = `
              #${targetId} {
                scroll-margin-top: ${headerHeight}px;
              }
            `;
            document.head.appendChild(style);
            
            // Scroll to the element
            elementToScroll.scrollIntoView({
              block: 'start',
              behavior: 'auto'
            });
            
            // Remove the temporary style
            setTimeout(() => {
              document.head.removeChild(style);
            }, 100);
          } catch (error) {
            // console.error("Scroll approach 2 failed:", error);
          }
        }, 50);
        
        // Approach 3: Manual scroll calculation
        setTimeout(() => {
          try {
            const rect = elementToScroll.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetPosition = rect.top + scrollTop - headerHeight;
            
            window.scrollTo(0, targetPosition);
          } catch (error) {
            // console.error("Scroll approach 3 failed:", error);
          }
        }, 100);
      }
    }, 50);
  };

  // Media handling functions
  const handleMediaTypeChange = (type) => {
    setMediaType(type);
  };

  const handleImageClick = (image) => {
    if (!image || !image.url) {
      // console.error("Invalid image data", image);
      return;
    }
    
    setSelectedImage(image);
    setViewImageModal(true);
    setImageLoading(true);
    setImageZoom(1);
  };

  const handleCloseImageModal = () => {
    setViewImageModal(false);
    setSelectedImage(null);
    setImageZoom(1);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.5, 1));
  };

  const handleTouchStart = (e) => {
    const touchDown = e.touches[0].clientX;
    setTouchPosition(touchDown);
  };

  const handleTouchMove = (e) => {
    if (touchPosition === null || !selectedImage) {
      return;
    }
    
    const currentPosition = e.touches[0].clientX;
    const difference = touchPosition - currentPosition;
    
    // If swipe distance is significant, navigate to next/previous image
    if (Math.abs(difference) > 50) {
      if (leadObj.media && leadObj.media[mediaType]) {
        const images = leadObj.media[mediaType].filter(item => 
          item.type && item.type.startsWith('image/'));
        
        if (images.length > 1) {
          const currentIndex = images.findIndex(img => img.id === selectedImage.id);
          
          if (difference > 0 && currentIndex < images.length - 1) {
            // Swipe left - next image
            setSelectedImage(images[currentIndex + 1]);
            setImageLoading(true);
          } else if (difference < 0 && currentIndex > 0) {
            // Swipe right - previous image
            setSelectedImage(images[currentIndex - 1]);
            setImageLoading(true);
          }
        }
      }
      
      setTouchPosition(null);
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      // console.error("File input reference is not available");
    }
  };
  
  const addMediaToLead = (event) => {
    try {
      const files = event?.target?.files;
      if (!files || files.length === 0) return;

      // Get the current lead data from Firebase to ensure we have the latest
      const currentLeadData = allLeadData[lead._id] || {};
      const updatedLead = { ...currentLeadData };
      
      // Initialize media object if it doesn't exist
      if (!updatedLead.media) {
        updatedLead.media = { before: [], after: [], documents: [] };
      }
      
      // Ensure all media categories exist
      if (!updatedLead.media.before) updatedLead.media.before = [];
      if (!updatedLead.media.after) updatedLead.media.after = [];
      if (!updatedLead.media.documents) updatedLead.media.documents = [];
      
      // Initialize the specific media type array if it doesn't exist
      if (!updatedLead.media[mediaType]) {
        updatedLead.media[mediaType] = [];
      }

      // Process each selected file
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const newMedia = {
              id: uuidv4(), // Use UUID for more reliable IDs
              name: file.name,
              type: file.type,
              url: e.target.result,
              size: file.size,
              lastModified: file.lastModified,
              dateAdded: new Date().toISOString()
            };
            
            // Add the new media to the appropriate category
            updatedLead.media[mediaType].push(newMedia);
            
            // Add to activity log
            if (!updatedLead.activities) {
              updatedLead.activities = [];
            }
            
            updatedLead.activities.push(createActivity(
              `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Media Added`,
              `Added ${file.name} to ${mediaType} photos/documents.`
            ));
            
            // Update the lead data in allLeadData
            setAllLeadData(prev => ({
              ...prev,
              [lead._id]: updatedLead
            }));
            
            // Persist to Firebase directly - use a more specific update to avoid overwriting other data
            updateLead(lead._id, {
              media: updatedLead.media,
              activities: updatedLead.activities
            }).catch(err => {
              // console.error("Error saving media to Firebase:", err);
            });
          } catch (err) {
            // console.error("Error processing file:", err);
          }
        };
        
        reader.onerror = (error) => {
          // console.error("Error reading file:", error);
        };
        
        try {
          reader.readAsDataURL(file);
        } catch (err) {
          // console.error("Error reading file:", err);
        }
      });
      
      // Clear the file input
      if (event?.target) {
        event.target.value = null;
      }
    } catch (err) {
      // console.error("Error in addMediaToLead:", err);
    }
  };
  
  const deleteMedia = (mediaType, index) => {
    try {
      if (!lead || !lead._id) {
        // console.error("Lead data is not available");
        return;
      }
      
      // Get the current lead data from allLeadData
      const currentLeadData = allLeadData[lead._id] || {};
      const updatedLead = { ...currentLeadData };
      
      // Initialize media object if it doesn't exist
      if (!updatedLead.media) {
        updatedLead.media = { before: [], after: [], documents: [] };
        // console.warn("Media object was missing, initialized empty media object");
        return; // Nothing to delete if media was just initialized
      }
      
      // Ensure all media categories exist
      if (!updatedLead.media.before) updatedLead.media.before = [];
      if (!updatedLead.media.after) updatedLead.media.after = [];
      if (!updatedLead.media.documents) updatedLead.media.documents = [];
      
      if (updatedLead.media && 
          updatedLead.media[mediaType] && 
          updatedLead.media[mediaType][index]) {
        
        const deletedItem = updatedLead.media[mediaType][index];
        
        // Remove the item
        updatedLead.media[mediaType] = [
          ...updatedLead.media[mediaType].slice(0, index),
          ...updatedLead.media[mediaType].slice(index + 1)
        ];
        
        // Add to activity log
        if (!updatedLead.activities) {
          updatedLead.activities = [];
        }
        
        updatedLead.activities.push(createActivity(
          `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Media Deleted`,
          `Deleted ${deletedItem.name || 'a file'} from ${mediaType} photos/documents.`
        ));
        
        // Update the lead data in allLeadData
        setAllLeadData(prev => ({
          ...prev,
          [lead._id]: updatedLead
        }));
        
        // Persist to Firebase directly - use a more specific update to avoid race conditions
        updateLead(lead._id, {
          media: updatedLead.media,
          activities: updatedLead.activities
        }).catch(err => {
          // console.error("Error saving media deletion to Firebase:", err);
        });
      } else {
        // console.warn("Media item not found at the specified index");
      }
    } catch (err) {
      // console.error("Error in deleteMedia:", err);
    }
  };

  // Function to handle document download
  const handleDocumentClick = (docItem) => {
    try {
      // Check if the URL is a base64 data URL
      const isDataUrl = docItem.url && docItem.url.startsWith('data:');
      
      // Get the filename
      const fileName = docItem.name || `Document-${docItem.id.substring(0, 8)}`;
      
      // For PDF files on mobile, we might need special handling
      if (docItem.type === 'application/pdf' && /Mobi|Android/i.test(navigator.userAgent) && !isDataUrl) {
        // For regular URLs (not data URLs), open in new tab
        window.open(docItem.url, '_blank');
        return;
      }
      
      // Create a download link
      const link = document.createElement('a');
      link.href = docItem.url;
      link.download = fileName;
      
      // For iOS Safari which doesn't support the download attribute well
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !isDataUrl) {
        // For regular URLs (not data URLs) on iOS, open in new tab
        window.open(docItem.url, '_blank');
        return;
      }
      
      // For data URLs or other browsers, proceed with download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Add to activity log
      const currentLeadData = allLeadData[lead._id] || {};
      const updatedLead = { ...currentLeadData };
      
      if (!updatedLead.activities) {
        updatedLead.activities = [];
      }
      
      updatedLead.activities.push(createActivity(
        "Document Downloaded",
        `Downloaded ${fileName}`
      ));
      
      // Update the lead data in allLeadData
      setAllLeadData(prev => ({
        ...prev,
        [lead._id]: updatedLead
      }));
      
      // Persist to Firebase directly
      updateLead(lead._id, {
        activities: updatedLead.activities
      }).catch(err => {
        // console.error("Error saving document download activity to Firebase:", err);
      });
      
    } catch (error) {
      // console.error("Error handling document:", error);
      // Fallback to opening in a new tab
      window.open(docItem.url, '_blank');
    }
  };

  // -------------------- Derived Values --------------------
  const displayedName = leadObj.customerName || lead.fullName || "";
  const displayedAmount = leadObj.contractAmount || lead.contractAmount || "0";
  // const appointmentDay = leadObj.appointmentDate || lead.appointmentDate ? formatDayOfWeek(leadObj.appointmentDate || lead.appointmentDate) : "";
  // const appointmentDateString = leadObj.appointmentDate || lead.appointmentDate ? formatTimestamp(leadObj.appointmentDate || lead.appointmentDate) : "";
  
  // Format appointment date in a more readable format
  const formatFullAppointmentDate = (timestamp) => {
    if (!timestamp) return "No date set";
    
    try {
      let date;
      
      // Handle Firestore timestamp objects (with seconds and nanoseconds)
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        // Convert Firestore timestamp to milliseconds and create a Date object
        date = new Date(timestamp.seconds * 1000);
      } else {
        // Handle regular timestamp (number or string)
        date = new Date(timestamp);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // console.error("Invalid date timestamp:", timestamp);
        return "Invalid date";
      }
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      // Add ordinal suffix to day
      let dayStr = day.toString();
      if (day > 3 && day < 21) dayStr += 'th';
      else if (day % 10 === 1) dayStr += 'st';
      else if (day % 10 === 2) dayStr += 'nd';
      else if (day % 10 === 3) dayStr += 'rd';
      else dayStr += 'th';
      
      // Format time
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
      
      return `${dayName} ${dayStr} ${month} ${year} @ ${hours}:${minutesStr}${ampm}`;
    } catch (error) {
      //console.error("Error formatting date:", error, timestamp);
      return "Error formatting date";
    }
  };
  
  const fullAppointmentDate = formatFullAppointmentDate(leadObj.appointmentDate || lead.appointmentDate);
  const pipelineStages = ["New Lead", "In Progress", "Quote Sent", "Completed", "Cancelled", "No Answer"];

  // Determine the index of the current stage
  const currentStageIndex = pipelineStages.indexOf(leadObj.stage);

  // Speed dial actions
  const actions = [
    { icon: <PoundSterlingIcon />, name: 'Update Price', onClick: handleOpenContractModal },
    { icon: <CalendarMonthIcon />, name: 'Schedule Appointment', onClick: handleOpenDateModal },
    { icon: <DescriptionIcon />, name: 'Create Proposal', onClick: handleOpenProposalModal },
    { icon: <EditIcon />, name: 'Change Stage', onClick: handleOpenStageModal },
  ];

  // Handle back button click
  const handleBackClick = () => {
    // Navigate back to MyLeads with the previous state to avoid reloading
    navigate("/my-leads", { state: previousState });
  };

  // -------------------- RENDER --------------------
  if (!hasLead) {
    // If no lead found in location.state
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          Lead data not found.
        </Typography>
        <Button onClick={handleBackClick}>Go Back</Button>
      </Box>
    );
  }

  return (
    <Box className="lead-detail-mobile-container">
      {/* Add the file input outside of any tab content so it's always available */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={addMediaToLead}
        // The accept attribute will be updated by the useEffect hook based on mediaType
        multiple
      />
      
      {/* Header - simplified to only show back button and customer name */}
      <Box className="mobile-header">
        <IconButton onClick={handleBackClick}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">{displayedName}</Typography>
      </Box>

      {/* Lead Summary Card */}
      <Box className="lead-summary-card">
        {/* Pipeline Visualization - single horizontal line without heading */}
        <Box className="pipeline-steps-container">
          <Box className="pipeline-steps-scroll-container">
            <Box className="pipeline-steps pipeline-steps-horizontal">
          {pipelineStages.map((stgName, idx) => {
                let stepClass = "pipeline-step";
            if (currentStageIndex >= 0) {
              if (idx < currentStageIndex) {
                    stepClass += " done";
              } else if (idx === currentStageIndex) {
                    stepClass += " active";
                if (stgName === "Rejected" || stgName === "Cancelled") {
                      stepClass += " red";
                }
              }
            }
            return (
                  <Box 
                    key={stgName} 
                    className={stepClass}
                    onClick={() => {
                      setOpenStageModal(true);
                    }}
                  >
                {stgName}
              </Box>
            );
          })}
        </Box>
          </Box>
          </Box>

        <Box className="lead-summary-header">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>Enquiry:</Typography>
            <Typography className="lead-title">
              {lead.workRequired || leadObj.workRequired || "No Enquiry"}
        </Typography>
          </Box>
          {(lead.details || leadObj.details) && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 1 }}>More info:</Typography>
              <Typography className="lead-description">{lead.details || leadObj.details}</Typography>
            </Box>
          )}
          {(lead.address || leadObj.address) && (
            <Typography className="lead-address">
              <LocationOnIcon fontSize="small" />
              {lead.address || leadObj.address}
          </Typography>
        )}
          <Box className="stage-pill">
            <CircleIcon sx={{ fontSize: 10, mr: 1 }} />
            {leadObj.stage || lead.stage || "New Lead"}
          </Box>
        </Box>

        {/* Contact Information */}
        <Box className="contact-section">
          <Typography className="section-title">
            <PersonIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            Contact Information
          </Typography>
          <Box className="contact-pills">
            {/* Name Pill */}
            <Box className="contact-pill">
              <PersonIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">Name</Typography>
                <Typography className="contact-pill-value">{displayedName}</Typography>
              </Box>
        </Box>

            {/* Email Pill */}
            <Box className="contact-pill">
              <EmailIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">Email</Typography>
                {/* Check for email in startDate field first, then fall back to email field */}
                {lead.startDate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.startDate) ? (
                  <a href={`mailto:${lead.startDate}`} className="contact-pill-value contact-link">
                    {lead.startDate}
                  </a>
                ) : leadObj.startDate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadObj.startDate) ? (
                  <a href={`mailto:${leadObj.startDate}`} className="contact-pill-value contact-link">
                    {leadObj.startDate}
                  </a>
                ) : lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) ? (
                  <a href={`mailto:${lead.email}`} className="contact-pill-value contact-link">
                    {lead.email}
                  </a>
                ) : leadObj.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadObj.email) ? (
                  <a href={`mailto:${leadObj.email}`} className="contact-pill-value contact-link">
                    {leadObj.email}
                  </a>
                ) : (
                  <Typography className="contact-pill-value">N/A</Typography>
                )}
              </Box>
            </Box>

            {/* Phone Pill */}
            <Box className="contact-pill">
              <PhoneIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">Phone</Typography>
                {lead.phoneNumber || leadObj.phoneNumber ? (
                  <a href={`tel:${lead.phoneNumber || leadObj.phoneNumber}`} className="contact-pill-value contact-link">
                    {lead.phoneNumber || leadObj.phoneNumber}
                  </a>
                ) : (
                  <Typography className="contact-pill-value">N/A</Typography>
                )}
              </Box>
            </Box>

            {/* City Pill */}
            <Box className="contact-pill">
              <LocationOnIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">City</Typography>
                <Typography className="contact-pill-value">{lead.city || leadObj.city || "N/A"}</Typography>
              </Box>
        </Box>

            {/* Builder Pill */}
            <Box className="contact-pill">
              <BusinessIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">Builder</Typography>
                <Typography className="contact-pill-value">{lead.builder || leadObj.builderName || "N/A"}</Typography>
              </Box>
            </Box>
            
            {/* Created Date Pill */}
            <Box className="contact-pill">
              <CalendarTodayIcon className="contact-pill-icon" />
              <Box className="contact-pill-content">
                <Typography className="contact-pill-label">Created</Typography>
                <Typography className="contact-pill-value">
                  {/* Check for Firestore timestamp object first */}
                  {lead.timestamp && typeof lead.timestamp === 'object' && lead.timestamp.seconds ? 
                    formatTimestamp(new Date(lead.timestamp.seconds * 1000)) :
                    lead.timestamp && !isNaN(new Date(lead.timestamp).getTime()) ? 
                      formatTimestamp(lead.timestamp) : 
                      "No date available"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Price Breakdown (formerly Contract Amount) */}
        <Box className="contract-section">
          <Typography className="section-title">
            Price Breakdown
        </Typography>
          <Box className="contract-card">
            <Box className="amount-display">
              <Typography className="amount-value">£{displayedAmount}</Typography>
              <Button 
                variant="contained" 
                size="small" 
                startIcon={<EditIcon />}
                onClick={handleOpenContractModal}
                className="update-amount-button"
              >
                Update
              </Button>
            </Box>
            {leadObj.contractAmount && Number(leadObj.contractAmount.replace(/,/g, '')) > 0 && (
              <>
                <Box className="price-breakdown">
                  <Box className="breakdown-item">
                    <Typography className="breakdown-label">Total Contract Value:</Typography>
                    <Typography className="breakdown-value">£{displayedAmount}</Typography>
                  </Box>
                  <Box className="breakdown-item">
                    <Typography className="breakdown-label">Profit:</Typography>
                    <Typography className="breakdown-value">£{leadObj.profit || lead.profit || "0"}</Typography>
                  </Box>
                  <Box className="breakdown-item">
                    <Typography className="breakdown-label">10% Fee (to Ehsaan):</Typography>
                    <Typography className="breakdown-value">
                      £{leadObj.profit || lead.profit ? formatWithCommas((Number((leadObj.profit || lead.profit).replace(/,/g, '')) * 0.1).toFixed(2)) : "0"}
                    </Typography>
                  </Box>
                </Box>
                <Typography className="amount-vat-note">
                  <InfoIcon fontSize="small" style={{ marginRight: '4px', fontSize: '16px' }} />
                  This is the amount payable to Ehsaan.
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={activeTab}
        onChange={handleTabChange}
        className="bottom-navigation"
      >
        <BottomNavigationAction 
          label="Activity" 
          icon={<HistoryIcon />} 
          className="nav-item nav-activity"
        />
        <BottomNavigationAction 
          label="Appointments" 
          icon={<CalendarMonthIcon />} 
          className="nav-item nav-appointments"
        />
        <BottomNavigationAction 
          label="Proposals" 
          icon={<DescriptionIcon />} 
          className="nav-item nav-proposals"
        />
        <BottomNavigationAction 
          label="Notes" 
          icon={<NoteIcon />} 
          className="nav-item nav-notes"
        />
        <BottomNavigationAction 
          label="Media" 
          icon={<ImageIcon />} 
          className="nav-item nav-media"
        />
      </BottomNavigation>

      {/* Tab Content */}
      <Box className="tab-content">
      {/* ACTIVITY TAB */}
        {activeTab === 0 && (
          <Box id="activity-tab-content" ref={activityTabRef}>
            <Box className="scroll-indicator" sx={{ height: '10px', width: '100%', bgcolor: 'transparent' }}></Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
        {leadObj.activities && leadObj.activities.length > 0 ? (
          leadObj.activities
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((act) => (
                  <Box key={act.id} className="activity-item">
                    <Box className="activity-icon">
                  {act.title.startsWith("Stage:") ? (
                    <DoubleArrowIcon fontSize="small" />
                  ) : act.title.includes("Appointment") ? (
                    <CalendarMonthIcon fontSize="small" />
                  ) : act.title === "Contract Amount Updated" ? (
                        <PoundSterlingIcon fontSize="small" />
                  ) : act.title.startsWith("Proposal") ? (
                        <DescriptionIcon fontSize="small" />
                  ) : (
                    <DoubleArrowIcon fontSize="small" />
                  )}
                </Box>
                    <Box className="activity-content">
                      <Typography className="activity-title">{act.title}</Typography>
                      <Typography className="activity-subtitle">{act.subtext}</Typography>
                      <Typography className="activity-time">
                        {/* Handle Firestore timestamp objects */}
                        {act.timestamp && typeof act.timestamp === 'object' && act.timestamp.seconds
                          ? formatTimestamp(new Date(act.timestamp.seconds * 1000))
                          : act.timestamp && !isNaN(new Date(act.timestamp).getTime())
                            ? formatTimestamp(act.timestamp)
                            : "Invalid Date"}
                      </Typography>
                </Box>
              </Box>
            ))
        ) : (
          <Typography>No activity available.</Typography>
        )}
          </Box>
        )}

      {/* APPOINTMENTS TAB */}
        {activeTab === 1 && (
          <Box id="appointments-tab-content" ref={appointmentsTabRef}>
            <Box className="scroll-indicator" sx={{ height: '10px', width: '100%', bgcolor: 'transparent' }}></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Appointments</Typography>
              <Button
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleOpenDateModal}
                sx={{ 
                  bgcolor: '#2A9D8F', 
                  borderRadius: '8px',
                  '&:hover': { bgcolor: '#238379' }
                }}
              >
                Add
              </Button>
            </Box>
            
            {!(leadObj.appointmentDate || lead.appointmentDate) ? (
              <Box className="appointment-empty">
                <CalendarMonthIcon className="appointment-empty-icon" />
                <Typography variant="body1" className="appointment-empty-text">
                  No appointments scheduled yet
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  onClick={handleOpenDateModal}
                >
                  Schedule Appointment
                </Button>
              </Box>
            ) : (
              <Box className="appointment-card-simple">
                <Box className="appointment-header">
                  <Box className="appointment-title-container">
                    <Typography className="appointment-type">
                      On-Site Estimate
                    </Typography>
                  </Box>
                  <IconButton 
                    onClick={(e) => setAnchorElAppt(e.currentTarget)}
                    sx={{ color: 'white' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Box className="appointment-content">
                  <Box className="appointment-with">
                    <PersonIcon className="appointment-with-icon" />
                    <Typography>
                      Meeting with <strong>{displayedName}</strong>
                    </Typography>
                  </Box>
                  
                  <Box className="appointment-datetime">
                    <CalendarTodayIcon className="appointment-datetime-icon" />
                    <Typography>
                      {fullAppointmentDate}
                    </Typography>
                  </Box>
                  
                  <Box className="appointment-location">
                    <LocationOnIcon className="appointment-location-icon" />
                    <Typography>
                      {lead.address || leadObj.address || "No address set"}
                    </Typography>
                  </Box>
                </Box>
                
                <Box className="appointment-actions">
                  <Button 
                    className="appointment-action-button edit"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setOpenDateModal(true);
                    }}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    className="appointment-action-button delete"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setOpenDeleteDialog(true);
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            )}
            
            <Menu
              anchorEl={anchorElAppt}
              open={Boolean(anchorElAppt)}
              onClose={() => setAnchorElAppt(null)}
            >
              <MenuItem
                onClick={() => {
                  setAnchorElAppt(null);
                  setOpenDateModal(true);
                }}
              >
                Update Appointment
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorElAppt(null);
                  setOpenDeleteDialog(true);
                }}
              >
                Delete Appointment
              </MenuItem>
            </Menu>
          </Box>
        )}

      {/* PROPOSALS TAB */}
        {activeTab === 2 && (
          <Box id="proposals-tab-content" ref={proposalsTabRef}>
            <Box className="scroll-indicator" sx={{ height: '10px', width: '100%', bgcolor: 'transparent' }}></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Proposals</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenProposalModal}
        >
                Create
        </Button>
            </Box>
            
        {leadObj.proposals && leadObj.proposals.length > 0 ? (
          leadObj.proposals
            .slice()
            .sort((a, b) => b.dateSent - a.dateSent)
            .map((proposal) => {
              const sentDateStr = proposal.dateSent
                ? formatTimestamp(proposal.dateSent)
                : "—";
                  const acceptedDateStr = proposal.status === "Completed" 
                    ? (proposal.dateAccepted ? formatTimestamp(proposal.dateAccepted) : formatTimestamp(Date.now()))
                    : proposal.status === "Pending" 
                      ? "Pending" 
                : "—";
              // const isPending = proposal.status === "Pending";
                  
              return (
                    <Box key={proposal.id} className="proposal-card">
                      <Box className="proposal-header">
                        <Box className="proposal-title-container">
                          <Typography className="proposal-number">
                            #{proposal.proposalNumber}
                          </Typography>
                          <Box 
                            className={`proposal-status ${proposal.status.toLowerCase()}`}
                          >
                            {proposal.status}
                          </Box>
                        </Box>
                        <IconButton onClick={(e) => handleProposalMenuOpen(e, proposal)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                      
                      <Typography className="proposal-inquiry-title">
                        {proposal.inquiryTitle}
                      </Typography>
                      
                      <Box className="proposal-amount-container">
                        <Typography className="proposal-amount-label">Amount:</Typography>
                        <Typography className="proposal-amount-value">£{proposal.amount}</Typography>
                      </Box>
                      
                      <Box className="proposal-dates">
                        <Box className="proposal-date-item">
                          <CalendarTodayIcon className="proposal-date-icon" />
                          <Box>
                            <Typography className="proposal-date-label">Sent:</Typography>
                            <Typography className="proposal-date-value">{sentDateStr}</Typography>
                          </Box>
                        </Box>
                        
                        <Box className="proposal-date-item">
                          <CheckCircleIcon className={`proposal-date-icon ${proposal.status === "Completed" ? "completed-icon" : ""}`} />
                          <Box>
                            <Typography className="proposal-date-label">Accepted:</Typography>
                            <Typography className={`proposal-date-value ${proposal.status === "Pending" ? "pending-text" : proposal.status === "Completed" ? "completed-text" : ""}`}>
                              {acceptedDateStr}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                </Box>
              );
            })
        ) : (
              <Box className="empty-state">
                <DescriptionIcon sx={{ fontSize: 48, color: '#E0E0E0', mb: 2 }} />
                <Typography sx={{ color: "#757575", mb: 1 }}>No proposals available</Typography>
                <Typography variant="body2" sx={{ color: "#9E9E9E", textAlign: "center", mb: 2 }}>
                  Create a proposal to send to your customer
                </Typography>
              </Box>
            )}
            
        <Menu
          anchorEl={proposalMenuAnchor}
          open={Boolean(proposalMenuAnchor)}
          onClose={handleProposalMenuClose}
        >
          <MenuItem onClick={() => handleProposalStatusChange("Pending")}>
            Mark as Pending
          </MenuItem>
          <MenuItem onClick={() => handleProposalStatusChange("Completed")}>
            Mark as Completed
          </MenuItem>
              <MenuItem 
                onClick={() => {
                  if (proposalMenuTarget) {
                    handleDeleteProposal(proposalMenuTarget.id);
                  }
                  handleProposalMenuClose();
                }}
                sx={{ color: 'error.main' }}
              >
                Delete Proposal
              </MenuItem>
        </Menu>
          </Box>
        )}

      {/* NOTES TAB */}
        {activeTab === 3 && (
          <Box id="notes-tab-content" ref={notesTabRef}>
            <Box className="scroll-indicator" sx={{ height: '10px', width: '100%', bgcolor: 'transparent' }}></Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>
        <NotesSection leadObj={leadObj} leadId={lead._id} onAddNote={handleAddNote} />
          </Box>
        )}

        {/* MEDIA TAB */}
        {activeTab === 4 && (
          <Box id="media-tab-content" ref={mediaTabRef}>
            <Box className="scroll-indicator" sx={{ height: '10px', width: '100%', bgcolor: 'transparent' }}></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Project Media</Typography>
              <Button 
                variant="contained" 
                startIcon={<CloudUploadIcon />}
                onClick={handleFileSelect}
                disabled={isOffline}
              >
                {mediaType === "documents" ? "Upload Document" : "Upload Image"}
              </Button>
            </Box>
            
            {/* Media Type Selector */}
            <Box className="media-type-selector">
              <Button 
                variant={mediaType === "before" ? "contained" : "outlined"}
                onClick={() => handleMediaTypeChange("before")}
                className="media-type-button"
                startIcon={<PhotoCameraIcon />}
              >
                Before
              </Button>
              <Button 
                variant={mediaType === "after" ? "contained" : "outlined"}
                onClick={() => handleMediaTypeChange("after")}
                className="media-type-button"
                startIcon={<PhotoCameraIcon />}
              >
                After
              </Button>
              <Button 
                variant={mediaType === "documents" ? "contained" : "outlined"}
                onClick={() => handleMediaTypeChange("documents")}
                className="media-type-button"
                startIcon={<InsertDriveFileIcon />}
              >
                Documents
              </Button>
            </Box>
            
            {isOffline && (
              <Box className="offline-warning">
                <WifiOffIcon color="warning" />
                <Typography variant="body2" color="warning.main">
                  You're offline. Some images may not load and uploads will be unavailable.
                </Typography>
              </Box>
            )}
            
            {/* Media Grid */}
            <Box className="media-grid">
              {leadObj.media && leadObj.media[mediaType] && leadObj.media[mediaType].length > 0 ? (
                leadObj.media[mediaType].map((item, index) => (
                  <Box key={item.id || index} className="media-item">
                    {item.type && item.type.startsWith('image/') ? (
                      <Box 
                        className="image-preview" 
                        onClick={() => handleImageClick(item)}
                      >
                        <img 
                          src={item.url} 
                          alt={item.name || `${mediaType} ${index + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Box>
                    ) : (
                      <Box 
                        className="document-preview"
                        onClick={() => handleDocumentClick(item)}
                      >
                        {item.type === 'application/pdf' ? (
                          <Box className="document-icon pdf">
                            <InsertDriveFileIcon sx={{ fontSize: 40 }} />
                            <Typography variant="caption" sx={{ mt: 1 }}>PDF</Typography>
                          </Box>
                        ) : item.type.includes('word') || item.type.includes('doc') ? (
                          <Box className="document-icon doc">
                            <InsertDriveFileIcon sx={{ fontSize: 40 }} />
                            <Typography variant="caption" sx={{ mt: 1 }}>DOC</Typography>
                          </Box>
                        ) : item.type.includes('sheet') || item.type.includes('excel') || item.type.includes('xls') ? (
                          <Box className="document-icon xls">
                            <InsertDriveFileIcon sx={{ fontSize: 40 }} />
                            <Typography variant="caption" sx={{ mt: 1 }}>XLS</Typography>
                          </Box>
                        ) : (
                          <Box className="document-icon">
                            <InsertDriveFileIcon sx={{ fontSize: 40 }} />
                            <Typography variant="caption" sx={{ mt: 1 }}>FILE</Typography>
                          </Box>
                        )}
                        <Typography className="document-name">{item.name || `File ${index + 1}`}</Typography>
                        <Button 
                          variant="outlined" 
                          size="small"
                          className="document-download-button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent the parent onClick from firing
                            handleDocumentClick(item);
                          }}
                          startIcon={<GetAppIcon fontSize="small" />}
                        >
                          Download
                        </Button>
                      </Box>
                    )}
                    <Box className="media-actions">
                      <Typography className="media-name" noWrap title={item.name}>
                        {item.name || `File ${index + 1}`}
                      </Typography>
                      <IconButton 
                        className="delete-media-button"
                        onClick={() => deleteMedia(mediaType, index)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box className="empty-media">
                  <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    No {mediaType === 'documents' ? 'documents' : 'images'} added yet
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Lead actions"
        className="fab"
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.onClick();
              setSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>

      {/* -------------------- MODALS -------------------- */}
      <ContractModal
        open={openContractModal}
        onClose={handleCloseContractModal}
        customerName={leadObj.customerName || lead.fullName}
        contractAmount={leadObj.contractAmount || lead.contractAmount}
        profit={leadObj.profit || lead.profit}
        onSave={handleSaveContract}
      />
      <AppointmentModal
        open={openDateModal}
        onClose={handleCloseDateModal}
        appointmentDate={leadObj.appointmentDate || lead.appointmentDate || null}
        onSave={handleSaveAppointment}
      />
      <StageModal
        open={openStageModal}
        onClose={handleCloseStageModal}
        currentStage={leadObj.stage || lead.stage || "New Lead"}
        onSave={handleSaveStage}
      />
      {tempProposal && (
        <ProposalModal
          open={openProposalModal}
          onClose={handleCloseProposalModal}
          proposal={tempProposal}
          onSave={handleSaveProposal}
        />
      )}
      <Dialog open={openDeleteDialog} onClose={cancelDeleteAppointment}>
        <DialogTitle>Delete Appointment</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to delete the appointment?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAppointment}>Cancel</Button>
          <Button variant="contained" onClick={confirmDeleteAppointment}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image View Modal */}
      <Dialog
        open={viewImageModal}
        onClose={handleCloseImageModal}
        className="image-view-modal"
        fullScreen
      >
        <DialogContent
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {imageLoading && (
            <Box className="image-loading">
              <CircularProgress />
            </Box>
          )}
          {selectedImage && (
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name || "Full size image"} 
              style={{ 
                transform: `scale(${imageZoom})`,
                transition: 'transform 0.3s ease',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onLoad={handleImageLoad}
            />
          )}
          <Box className="image-controls">
            <IconButton onClick={handleCloseImageModal} className="close-button">
              <CloseIcon />
            </IconButton>
            <Box className="zoom-controls">
              <IconButton onClick={handleZoomOut} disabled={imageZoom <= 1}>
                <ZoomOutIcon />
              </IconButton>
              <IconButton onClick={handleZoomIn} disabled={imageZoom >= 3}>
                <ZoomInIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
