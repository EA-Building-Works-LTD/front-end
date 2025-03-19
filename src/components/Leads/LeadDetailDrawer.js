// src/components/Leads/LeadDetailDrawer.js
import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Paper,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  CircularProgress,
  Stack,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CircleIcon from "@mui/icons-material/Circle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import NoteIcon from "@mui/icons-material/Note";
import DescriptionIcon from "@mui/icons-material/Description";
import HistoryIcon from "@mui/icons-material/History";
import ImageIcon from "@mui/icons-material/Image";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";

import {
  formatTimestamp,
  formatDayOfWeek,
  formatWithCommas,
} from "../../utils/dateUtils";

import { v4 as uuidv4 } from "uuid";
import useFirebaseState from "../../hooks/useFirebaseState";
import { auth } from "../../firebase/config";
import { updateLead, updateLeadStage, addLeadProposal } from "../../firebase/leads";
import ContractModal from '../Modals/ContractModal';
import AppointmentModal from '../Appointments/AppointmentModal';
import StageModal from '../Modals/StageModal';
import ProposalModal from '../Modals/ProposalModal';
import NotesSection from './NotesSection';
import ProjectMediaTab from "./ProjectMediaTab";

import "./LeadDetailDrawer.css";

export default function LeadDetailDrawer({ open, onClose, lead }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [allLeadData, setAllLeadData, leadDataLoading] = useFirebaseState(
    "leadData",
    auth.currentUser?.uid || "anonymous",
    "myLeadData",
    {}
  );
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openContractModal, setOpenContractModal] = useState(false);
  const [openDateModal, setOpenDateModal] = useState(false);
  const [openStageModal, setOpenStageModal] = useState(false);
  const [openProposalModal, setOpenProposalModal] = useState(false);
  const [tempProposal, setTempProposal] = useState(null);
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);

  // ----- Activity Helpers -----

  // Creates a general activity entry
  function createActivity(title, subtext) {
    return { id: uuidv4(), timestamp: Date.now(), title, subtext };
  }

  // Creates an appointment activity based on old vs new date
  function getAppointmentActivity(oldDate, newDate) {
    if (!newDate && oldDate) {
      return createActivity("Appointment Deleted", "User removed the appointment date/time.");
    }
    if (!oldDate && newDate) {
      return createActivity(
        "Appointment Created",
        `Appointment set on ${formatTimestamp(newDate)}`
      );
    }
    if (oldDate && newDate) {
      return createActivity(
        "Appointment Updated",
        `Appointment changed from ${formatTimestamp(oldDate)} to ${formatTimestamp(newDate)}`
      );
    }
    return null;
  }

  // Creates a stage change activity if needed
  function getStageActivity(oldStage, newStage) {
    if (newStage !== oldStage) {
      return createActivity(
        `Stage: ${oldStage} → ${newStage}`,
        `Lead has been moved to the ${newStage} stage.`
      );
    }
    return null;
  }

  // Creates a contract amount change activity if needed
  function getContractActivity(oldAmount, newAmount) {
    if (newAmount !== oldAmount) {
      return createActivity(
        "Contract Amount Updated",
        `Contract changed from £${oldAmount || "0"} to £${newAmount}`
      );
    }
    return null;
  }

  // ----- End Activity Helpers -----

  /**
   * On every render of a valid lead, ensure `myLeadData[lead._id]`
   * has address & builder. If it doesn't exist, we create it.
   * If it does exist but is missing those fields, we add them.
   */
  useEffect(() => {
    if (!lead || !lead._id) return;

    setAllLeadData((prev) => {
      const oldObj = prev[lead._id];

      // If this lead isn't in localStorage yet
      if (!oldObj) {
        const newLeadObj = {
          address: lead.address || "",
          builder: lead.builder || "",
          stage: lead.stage || "New Lead",
          customerName: lead.fullName || "",
          contractAmount: "",
          appointmentDate: null,
          notes: [],
          proposals: [],
          media: {
            before: [],
            after: [],
            documents: [],
          },
          activities: [
            createActivity(
              `Stage: New Lead added for ${lead.builder || "unknown"}`,
              `Lead has been submitted on ${formatTimestamp(lead.timestamp)}`
            ),
          ],
        };
        return { ...prev, [lead._id]: newLeadObj };
      }

      // Otherwise, patch missing address/builder if needed
      const updated = { ...oldObj };
      let changed = false;

      if (!updated.address && lead.address) {
        updated.address = lead.address;
        changed = true;
      }
      if (!updated.builder && lead.builder) {
        updated.builder = lead.builder;
        changed = true;
      }

      return changed ? { ...prev, [lead._id]: updated } : prev;
    });
  }, [lead, setAllLeadData]);

  // If lead is invalid, render nothing
  if (!lead || !lead._id) {
    return null;
  }

  // Lead data from local storage
  const leadObj = allLeadData[lead._id] || {};

  // ----- Update Logic -----

  /**
   * Merges `changes` into the existing lead data in Firebase,
   * plus any activity log entries for stage, contract, or appointment changes.
   */
  function updateLeadData(changes) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const updatedActivities = [...(oldData.activities || [])];

      // Stage changes
      if ("stage" in changes) {
        const stageAct = getStageActivity(oldData.stage, changes.stage);
        if (stageAct) updatedActivities.push(stageAct);
        
        // Add stageManuallySet flag when stage is manually changed
        changes.stageManuallySet = true;
      }

      // Contract changes
      if ("contractAmount" in changes) {
        const contractAct = getContractActivity(oldData.contractAmount, changes.contractAmount);
        if (contractAct) updatedActivities.push(contractAct);
      }

      // Appointment changes
      if ("appointmentDate" in changes) {
        const aptAct = getAppointmentActivity(oldData.appointmentDate, changes.appointmentDate);
        if (aptAct) updatedActivities.push(aptAct);
      }

      const updatedLead = {
        ...oldData,
        ...changes,
        activities: updatedActivities,
      };

      // Update the lead in Firebase (async)
      updateLead(lead._id, updatedLead).catch(err => 
        console.error("Error updating lead in Firebase:", err)
      );

      return {
        ...prev,
        [lead._id]: updatedLead,
      };
    });
  }

  // Add a new proposal
  const addProposalToLead = async (proposal) => {
    try {
      // Make sure the proposal has a builderId
      if (!proposal.builderId) {
        proposal.builderId = auth.currentUser?.uid;
      }

      const newLead = {
        ...leadObj,
        proposals: [...(leadObj.proposals || []), proposal],
      };

      // Add an activity log for the new proposal
      const newActivity = {
        id: Date.now(),
        timestamp: Date.now(),
        title: "Proposal Created",
        subtext: `Proposal #${proposal.proposalNumber} created for £${proposal.amount}`,
      };

      newLead.activities = [...(newLead.activities || []), newActivity];

      // Use the addLeadProposal function from api/leads.js to properly save the proposal with Firebase
      await addLeadProposal(lead._id, proposal, newActivity);

      // Update local state
      setAllLeadData((prev) => ({
        ...prev,
        [lead._id]: newLead,
      }));

      // Call the onClose prop to close the drawer
      onClose();

      toast.success("Proposal added successfully");
    } catch (error) {
      console.error("Error adding proposal:", error);
      toast.error("Failed to add proposal");
    }
  };

  // Update a proposal's status
  function updateProposalStatus(proposalId, newStatus) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldProposals = oldData.proposals || [];

      const updatedProposals = oldProposals.map((p) =>
        p.id === proposalId ? { ...p, status: newStatus } : p
      );

      const newActivity = createActivity(
        "Proposal Status Updated",
        `Proposal #${proposalId} changed status to ${newStatus}`
      );

      return {
        ...prev,
        [lead._id]: {
          ...oldData,
          proposals: updatedProposals,
          activities: [...(oldData.activities || []), newActivity],
        },
      };
    });
  }

  // Handler for media updates
  const handleSaveMedia = (newMedia) => {
    updateLeadData({ media: newMedia });
  };

  // ----- Modal Handlers -----

  // Contract Modal
  const handleOpenContractModal = () => {
    setOpenContractModal(true);
  };
  const handleSaveContract = (newCustomerName, newContract) => {
    const finalAmount = newContract ? formatWithCommas(newContract) : "0";
    updateLeadData({
      contractAmount: finalAmount,
      customerName: newCustomerName,
    });
    setOpenContractModal(false);
  };

  // Appointment Modal
  const handleOpenDateModal = () => {
    setOpenDateModal(true);
  };
  const handleSaveAppointment = (date) => {
    // Ensure we're working with a valid timestamp
    if (date && !isNaN(new Date(date).getTime())) {
      console.log("Saving valid appointment date:", date);
      updateLeadData({ appointmentDate: date });
    } else {
      console.error("Invalid appointment date received:", date);
    }
    setOpenDateModal(false);
  };

  // Stage Modal
  const handleOpenStageModal = () => {
    setOpenStageModal(true);
  };
  const handleSaveStage = (stage) => {
    // First update the lead stage directly in Firebase
    updateLeadStage(lead._id, stage, true).then(() => {
      // Then update the local state
      updateLeadData({ stage });
      setOpenStageModal(false);
      
      // Force refresh the parent component by updating the lead in the global state
      // Explicitly update the leads array to force a re-render of the parent table
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('leadStageUpdated', { 
          detail: { leadId: lead._id, newStage: stage } 
        });
        window.dispatchEvent(event);
      }
      
      // Show success notification
      toast.success(`Lead stage updated to "${stage}"`, {
        position: "bottom-right",
        autoClose: 2000
      });
    }).catch(err => {
      console.error("Error updating lead stage:", err);
      toast.error("Failed to update lead stage");
      setOpenStageModal(false);
    });
  };

  // Proposal Modal
  const handleOpenProposalModal = () => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000).toString();
    setTempProposal({
      id: uuidv4(),
      proposalNumber: randomNumber,
      inquiryTitle: lead.workRequired || "No Enquiry",
      dateSent: Date.now(),
      dateAccepted: null,
      status: "Pending",
      amount: leadObj.contractAmount || "0",
      builderId: auth.currentUser?.uid,
    });
    setOpenProposalModal(true);
  };
  const handleSaveProposal = (proposal) => {
    addProposalToLead(proposal);
    setOpenProposalModal(false);
  };

  // Proposal Menu
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

  // Deleting appointment
  const confirmDeleteAppointment = () => {
    setOpenDeleteDialog(false);
    updateLeadData({ appointmentDate: null });
  };
  const cancelDeleteAppointment = () => {
    setOpenDeleteDialog(false);
  };

  // Adding a new note
  const handleAddNote = (noteContent) => {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldNotes = oldData.notes || [];
      const oldActivities = oldData.activities || [];

      const noteObj = { id: uuidv4(), timestamp: Date.now(), content: noteContent };
      const noteActivity = createActivity("Note Added", `User added a note: "${noteContent}"`);

      return {
        ...prev,
        [lead._id]: {
          ...oldData,
          notes: [...oldNotes, noteObj],
          activities: [...oldActivities, noteActivity],
        },
      };
    });
  };

  // ----- Derived Display Values -----
  const displayedName = leadObj.customerName || "";
  const displayedAmount = leadObj.contractAmount || "0";
  const dealNumberString = `Lead # ${formatTimestamp(lead.timestamp)}`;
  const appointmentDay = leadObj.appointmentDate
    ? formatDayOfWeek(leadObj.appointmentDate)
    : "";
  const appointmentDateString = leadObj.appointmentDate
    ? formatTimestamp(leadObj.appointmentDate)
    : "";
    
  // Format builder name - use display name if available, otherwise use email
  const formatBuilderName = (builderName) => {
    if (!builderName) return "";
    
    // If the builder name is an email address, try to extract a name from it
    if (builderName.includes('@')) {
      // Try to get the part before the @ symbol
      const namePart = builderName.split('@')[0];
      
      // Format it to look more like a name (capitalize first letter of each word)
      return namePart
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    
    return builderName;
  };
  
  const displayedBuilderName = formatBuilderName(lead.builder);
  const displayedBuilderInitial = displayedBuilderName ? displayedBuilderName[0] : "";

  // Function to handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Get stage color
  const getStageColor = (stage) => {
    switch (stage) {
      case 'New Lead':
        return theme.palette.info.main;
      case 'Quote Sent':
        return theme.palette.warning.main;
      case 'In Progress':
        return theme.palette.primary.main;
      case 'Completed':
        return theme.palette.success.main;
      case 'Cancelled':
        return theme.palette.error.main;
      case 'No Answer':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "75%" },
            maxWidth: "1200px",
            bgcolor: theme.palette.background.default,
          },
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={onClose} 
              aria-label="close"
              sx={{ mr: 1 }}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Lead Details
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Change Stage">
              <Chip 
                label={leadObj.stage || "New Lead"} 
                onClick={handleOpenStageModal}
                sx={{ 
                  bgcolor: getStageColor(leadObj.stage),
                  color: '#fff',
                  fontWeight: 500,
                  '& .MuiChip-label': { px: 2 },
                  cursor: 'pointer',
                }} 
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Main content */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            height: 'calc(100% - 64px)',
            overflow: 'hidden',
          }}
        >
          {/* Left sidebar */}
          <Box 
            sx={{ 
              width: { xs: '100%', md: '35%', lg: '30%' },
              borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
              p: 3,
              overflow: 'auto',
              bgcolor: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Lead Summary Section */}
            <Card 
              elevation={0} 
              sx={{ 
                mb: 3, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {dealNumberString}
                </Typography>
                
                <Typography variant="h5" sx={{ fontWeight: 600, mt: 1, mb: 2, color: theme.palette.text.primary }}>
                  {lead.workRequired || "No Enquiry"}
                </Typography>
                
                {lead.details && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {lead.details}
                  </Typography>
                )}
                
                {lead.address && (
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <LocationOnIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {lead.address}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
                Quick Actions
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CalendarMonthIcon />}
                  onClick={handleOpenDateModal}
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    flex: 1,
                    textTransform: 'none',
                  }}
                >
                  {leadObj.appointmentDate ? "Update Appointment" : "Schedule Appointment"}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleOpenStageModal}
                  sx={{
                    minWidth: 'auto',
                    p: 1,
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                  }}
                >
                  <DoubleArrowIcon />
                </Button>
              </Stack>
              
              <Button
                variant="contained"
                startIcon={<AttachMoneyIcon />}
                onClick={handleOpenContractModal}
                fullWidth
                sx={{
                  bgcolor: theme.palette.secondary.main,
                  color: theme.palette.secondary.contrastText,
                  textTransform: 'none',
                  mb: 2,
                }}
              >
                Update Contract
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={handleOpenProposalModal}
                fullWidth
                sx={{
                  textTransform: 'none',
                }}
              >
                Create Proposal
              </Button>
            </Box>
            
            {/* Contract amount card */}
            <Card 
              sx={{ 
                mb: 3, 
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                boxShadow: 2,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ color: theme.palette.primary.contrastText }}>
                    Contract Amount
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.contrastText }}>
                    £{displayedAmount}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Tooltip title="Edit Contract">
                    <IconButton 
                      size="small" 
                      onClick={handleOpenContractModal}
                      sx={{ color: theme.palette.primary.contrastText }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
            
            {/* Contact details */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              Contact Details
              {lead.googleFormSubmission && (
                <Chip 
                  size="small" 
                  label="Google Form" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1, height: 20 }} 
                />
              )}
            </Typography>
            
            <Card 
              elevation={0} 
              sx={{ 
                mb: 3, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.primary.main,
                      width: 40,
                      height: 40,
                      mr: 2,
                    }}
                  >
                    {displayedName[0] || <PersonIcon />}
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                    {displayedName || "No Name"}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {lead.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon color="action" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2" color="text.primary">{lead.email}</Typography>
                    </Box>
                  </Box>
                )}
                
                {lead.phoneNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhoneIcon color="action" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body2" color="text.primary">{lead.phoneNumber}</Typography>
                    </Box>
                  </Box>
                )}
                
                {lead.city && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon color="action" sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        City
                      </Typography>
                      <Typography variant="body2" color="text.primary">{lead.city}</Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            {/* Builder info */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              Builder
            </Typography>
            
            <Card 
              elevation={0} 
              sx={{ 
                mb: 3, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.secondary.main,
                      width: 40,
                      height: 40,
                      mr: 2,
                    }}
                  >
                    {displayedBuilderInitial || <PersonIcon />}
                  </Avatar>
                  <Typography variant="body1" color="text.primary">
                    {displayedBuilderName || "No Builder Assigned"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', pt: 2 }}>
              Lead created {formatTimestamp(lead.timestamp)}
            </Typography>
          </Box>

          {/* Right content area */}
          <Box 
            sx={{ 
              width: { xs: '100%', md: '65%', lg: '70%' },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: theme.palette.background.paper }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons={isMobile ? "auto" : false}
                sx={{ 
                  px: 2,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    color: theme.palette.text.secondary,
                  },
                  '& .Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  },
                }}
              >
                <Tab label="Activity" icon={<HistoryIcon />} iconPosition="start" />
                <Tab label="Appointments" icon={<CalendarMonthIcon />} iconPosition="start" />
                <Tab label="Proposals" icon={<DescriptionIcon />} iconPosition="start" />
                <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
                <Tab label="Media" icon={<ImageIcon />} iconPosition="start" />
              </Tabs>
            </Box>
            
            {/* Tab content */}
            <Box sx={{ p: 3, overflow: 'auto', flexGrow: 1, bgcolor: theme.palette.background.default }}>
              {/* Activity Tab */}
              {activeTab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>Latest Activity</Typography>
                  </Box>
                  
                  {leadDataLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (leadObj.activities || []).length === 0 ? (
                    <Paper 
                      sx={{ 
                        p: 3, 
                        textAlign: 'center',
                        bgcolor: theme.palette.grey[50],
                        border: `1px dashed ${theme.palette.grey[300]}`,
                      }}
                    >
                      <HistoryIcon sx={{ fontSize: 40, color: theme.palette.grey[400], mb: 1 }} />
                      <Typography variant="body1" sx={{ mb: 1, color: theme.palette.text.primary }}>
                        No activity recorded yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Activities will appear here as you interact with this lead.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(leadObj.activities || [])
                        .slice()
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((act) => {
                          // Determine icon based on activity type
                          let ActivityIcon = HistoryIcon;
                          let iconColor = theme.palette.primary.main;
                          
                          if (act.title.startsWith("Stage:")) {
                            ActivityIcon = DoubleArrowIcon;
                            iconColor = theme.palette.info.main;
                          } else if (act.title.includes("Appointment")) {
                            ActivityIcon = CalendarMonthIcon;
                            iconColor = theme.palette.warning.main;
                          } else if (act.title === "Contract Amount Updated") {
                            ActivityIcon = AttachMoneyIcon;
                            iconColor = theme.palette.success.main;
                          } else if (act.title.startsWith("Proposal")) {
                            ActivityIcon = DescriptionIcon;
                            iconColor = theme.palette.secondary.main;
                          } else if (act.title.includes("Note")) {
                            ActivityIcon = NoteIcon;
                            iconColor = theme.palette.grey[700];
                          }
                          
                          return (
                            <Card
                              key={act.id}
                              elevation={1}
                              sx={{
                                borderLeft: `4px solid ${iconColor}`,
                                borderRadius: 1,
                                overflow: 'visible',
                              }}
                            >
                              <CardContent sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 2,
                                p: 2,
                              }}>
                                <Avatar sx={{ bgcolor: iconColor, width: 40, height: 40 }}>
                                  <ActivityIcon fontSize="small" />
                                </Avatar>
                                
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                    {act.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {act.subtext}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {formatTimestamp(act.timestamp)}
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Appointments Tab */}
              {activeTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>Appointments</Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={handleOpenDateModal}
                      sx={{ textTransform: 'none' }}
                    >
                      Create Appointment
                    </Button>
                  </Box>
                  
                  {!leadObj.appointmentDate ? (
                    <Paper 
                      sx={{ 
                        p: 3, 
                        textAlign: 'center',
                        bgcolor: theme.palette.grey[50],
                        border: `1px dashed ${theme.palette.grey[300]}`,
                      }}
                    >
                      <CalendarMonthIcon sx={{ fontSize: 40, color: theme.palette.grey[400], mb: 1 }} />
                      <Typography variant="body1" sx={{ mb: 1, color: theme.palette.text.primary }}>
                        No appointments scheduled
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click the "Create Appointment" button to schedule a meeting with this lead.
                      </Typography>
                    </Paper>
                  ) : (
                    <Card sx={{ mb: 2, borderRadius: 1 }}>
                      <CardContent sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                        p: 3,
                      }}>
                        <Box 
                          sx={{ 
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            p: 2,
                            borderRadius: 1,
                            textAlign: 'center',
                            minWidth: { xs: '100%', sm: 120 },
                          }}
                        >
                          <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                            {appointmentDay}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {appointmentDateString}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: theme.palette.text.primary,
                          }}>
                            <CircleIcon sx={{ fontSize: 10, color: theme.palette.success.main }} />
                            On-Site Estimate with {leadObj.customerName || "Customer"}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                            <LocationOnIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            {leadObj.address || "No address set"}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
                            <PersonIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            {displayedBuilderName || "No builder assigned"}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Tooltip title="Appointment Options">
                            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                  >
                    <MenuItem
                      onClick={() => {
                        setAnchorEl(null);
                        setOpenDateModal(true);
                      }}
                    >
                      Update Appointment
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setAnchorEl(null);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      Delete Appointment
                    </MenuItem>
                  </Menu>
                </Box>
              )}
              
              {/* Proposals Tab */}
              {activeTab === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>Proposals</Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={handleOpenProposalModal}
                      sx={{ textTransform: 'none' }}
                    >
                      Create Proposal
                    </Button>
                  </Box>
                  
                  {(leadObj.proposals || []).length === 0 ? (
                    <Paper 
                      sx={{ 
                        p: 3, 
                        textAlign: 'center',
                        bgcolor: theme.palette.grey[50],
                        border: `1px dashed ${theme.palette.grey[300]}`,
                      }}
                    >
                      <DescriptionIcon sx={{ fontSize: 40, color: theme.palette.grey[400], mb: 1 }} />
                      <Typography variant="body1" sx={{ mb: 1, color: theme.palette.text.primary }}>
                        No proposals created yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click the "Create Proposal" button to create a new proposal for this lead.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(leadObj.proposals || [])
                        .slice()
                        .sort((a, b) => b.dateSent - a.dateSent)
                        .map((proposal) => {
                          const sentDateStr = proposal.dateSent
                            ? formatTimestamp(proposal.dateSent)
                            : "—";
                          const acceptedDateStr = proposal.dateAccepted
                            ? formatTimestamp(proposal.dateAccepted)
                            : "—";
                          const isPending = proposal.status === "Pending";
                          const statusColor = isPending 
                            ? theme.palette.warning.main 
                            : theme.palette.success.main;

                          return (
                            <Card key={proposal.id} sx={{ borderRadius: 1 }}>
                              <CardContent sx={{ p: 3 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  justifyContent: 'space-between', 
                                  alignItems: { xs: 'flex-start', sm: 'center' },
                                  gap: 2,
                                }}>
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                      <Chip 
                                        label={`#${proposal.proposalNumber}`} 
                                        size="small" 
                                        sx={{ fontWeight: 600 }} 
                                      />
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                        {proposal.inquiryTitle}
                                      </Typography>
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 3 } }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Sent: {sentDateStr}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        Accepted: {acceptedDateStr}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    ml: { xs: 0, sm: 'auto' },
                                  }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                      £{proposal.amount}
                                    </Typography>
                                    <Chip 
                                      label={proposal.status.toUpperCase()} 
                                      size="small"
                                      sx={{ 
                                        bgcolor: statusColor,
                                        color: 'white',
                                        fontWeight: 600,
                                      }} 
                                    />
                                    <Tooltip title="Proposal Options">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleProposalMenuOpen(e, proposal)}
                                      >
                                        <MoreVertIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })}
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
                  </Menu>
                </Box>
              )}
              
              {/* Notes Tab */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, color: theme.palette.text.primary }}>Notes</Typography>
                  <NotesSection
                    leadObj={leadObj}
                    leadId={lead._id}
                    onAddNote={handleAddNote}
                  />
                </Box>
              )}
              
              {/* Media Tab */}
              {activeTab === 4 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, color: theme.palette.text.primary }}>Project Media</Typography>
                  <ProjectMediaTab
                    media={leadObj.media || { before: [], after: [], documents: [] }}
                    onSaveMedia={handleSaveMedia}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* MODALS */}
      <ContractModal
        open={openContractModal}
        onClose={() => setOpenContractModal(false)}
        customerName={leadObj.customerName}
        contractAmount={leadObj.contractAmount}
        onSave={handleSaveContract}
      />

      <AppointmentModal
        open={openDateModal}
        onClose={() => setOpenDateModal(false)}
        appointmentDate={leadObj.appointmentDate}
        onSave={handleSaveAppointment}
      />

      <StageModal
        open={openStageModal}
        onClose={() => setOpenStageModal(false)}
        currentStage={leadObj.stage}
        onSave={handleSaveStage}
      />

      {tempProposal && (
        <ProposalModal
          open={openProposalModal}
          onClose={() => setOpenProposalModal(false)}
          proposal={tempProposal}
          onSave={handleSaveProposal}
        />
      )}

      <Dialog 
        open={openDeleteDialog} 
        onClose={cancelDeleteAppointment}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: 400,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, color: theme.palette.text.primary }}>Delete Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.primary">
            Are you sure you want to delete the appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={cancelDeleteAppointment}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteAppointment}
            variant="contained" 
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
