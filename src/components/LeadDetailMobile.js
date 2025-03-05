// src/LeadDetailMobile.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Button,
  Tabs,
  Tab,
  Paper,
  useMediaQuery,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import AddIcon from "@mui/icons-material/Add";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CircleIcon from "@mui/icons-material/Circle";
import MenuIcon from "@mui/icons-material/Menu";

// Utilities & ephemeral state hook
import { formatTimestamp, formatDayOfWeek } from "../utils/dateUtils";
import { formatWithCommas } from "../utils/dateUtils";
import { v4 as uuidv4 } from "uuid";
import useLocalStorageState from "../hooks/useLocalStorageState";

// Components (same functionality as desktop)
import NotesSection from './NotesSection';
import ProjectMediaTab from "./ProjectMediaTab";
import StageModal from './StageModal';
import AppointmentModal from './AppointmentModal';
import ContractModal from './ContractModal';
import ProposalModal from './ProposalModal';

// CSS
import "./LeadDetailMobile.css";

// Helper for TabPanel
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lead-mobile-tabpanel-${index}`}
      aria-labelledby={`lead-mobile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

// Helper: Create an activity log entry
function createActivity(title, subtext) {
  return { id: uuidv4(), timestamp: Date.now(), title, subtext };
}

export default function LeadDetailMobile() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  // Ephemeral state for lead data
  const [allLeadData, setAllLeadData] = useLocalStorageState("myLeadData", {});

  // Local UI state
  const [tabIndex, setTabIndex] = useState(0);
  const [openContractModal, setOpenContractModal] = useState(false);
  const [openDateModal, setOpenDateModal] = useState(false);
  const [openStageModal, setOpenStageModal] = useState(false);
  const [openProposalModal, setOpenProposalModal] = useState(false);
  const [tempProposal, setTempProposal] = useState(null);
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);
  const [anchorElAppt, setAnchorElAppt] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Retrieve lead from router state
  const lead = location.state?.lead;
  const hasLead = Boolean(lead);

  // If screen is desktop, redirect
  useEffect(() => {
    if (isDesktop) {
      navigate("/my-leads", { replace: true });
    }
  }, [isDesktop, navigate]);

  // Initialize ephemeral data if not present
  useEffect(() => {
    if (hasLead && lead._id && !allLeadData[lead._id]) {
      const initialLeadObj = {
        contractAmount: "",
        stage: lead.stage || "New Lead",
        customerName: lead.fullName || "",
        appointmentDate: null,
        notes: [],
        proposals: [],
        media: { before: [], after: [], documents: [] },
        activities: [
          createActivity(
            `Stage: New Lead added for ${lead.builder || "unknown"}`,
            `Lead has been submitted on ${formatTimestamp(lead.timestamp)}`
          ),
        ],
      };
      setAllLeadData((prev) => ({ ...prev, [lead._id]: initialLeadObj }));
    }
  }, [hasLead, lead, allLeadData, setAllLeadData]);

  // The ephemeral lead object
  const leadObj = hasLead ? allLeadData[lead._id] || {} : {};

  // -------------------- UPDATE HELPERS (same as desktop) --------------------
  function updateLeadData(changes) {
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
      return {
        ...prev,
        [lead._id]: { ...oldData, ...changes, activities: updatedActivities },
      };
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
      return {
        ...prev,
        [lead._id]: { ...oldData, proposals: [...oldProposals, proposal], activities: newActivities },
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
          return { ...p, status: newStatus };
        }
        return p;
      });
      return {
        ...prev,
        [lead._id]: { ...oldData, proposals: updatedProposals, activities: oldActivities },
      };
    });
  }

  function handleAddNote(noteContent) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldNotes = oldData.notes || [];
      const oldActivities = oldData.activities || [];
      const noteObj = { id: Date.now(), timestamp: Date.now(), content: noteContent };
      const noteActivity = createActivity(
        "Note Added",
        `User added a note: "${noteContent}"`
      );
      return {
        ...prev,
        [lead._id]: { ...oldData, notes: [...oldNotes, noteObj], activities: [...oldActivities, noteActivity] },
      };
    });
  }

  // -------------------- UI ACTION HANDLERS --------------------
  // Contract
  const handleOpenContractModal = () => setOpenContractModal(true);
  const handleCloseContractModal = () => setOpenContractModal(false);
  const handleSaveContract = (newName, newContract) => {
    const finalAmount = newContract ? formatWithCommas(newContract) : "0";
    updateLeadData({ contractAmount: finalAmount, customerName: newName });
    setOpenContractModal(false);
  };

  // Appointment
  const handleOpenDateModal = () => setOpenDateModal(true);
  const handleCloseDateModal = () => setOpenDateModal(false);
  const handleSaveAppointment = (date) => {
    updateLeadData({ appointmentDate: date });
    setOpenDateModal(false);
  };

  // Stage
  const handleOpenStageModal = () => setOpenStageModal(true);
  const handleCloseStageModal = () => setOpenStageModal(false);
  const handleSaveStage = (stage) => {
    updateLeadData({ stage });
    setOpenStageModal(false);
  };

  // Proposal
  const handleOpenProposalModal = () => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000).toString();
    setTempProposal({
      id: Date.now(),
      proposalNumber: randomNumber,
      inquiryTitle: lead.workRequired || "No Enquiry",
      dateSent: Date.now(),
      dateAccepted: null,
      status: "Pending",
      amount: leadObj.contractAmount || "0",
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
    setTabIndex(newValue);
  };

  // -------------------- Derived Values --------------------
  const displayedName = leadObj.customerName || lead.fullName || "";
  const displayedAmount = leadObj.contractAmount || "0";
  const dealNumberString = `Lead # ${formatTimestamp(lead.timestamp)}`;
  const appointmentDay = leadObj.appointmentDate ? formatDayOfWeek(leadObj.appointmentDate) : "";
  const appointmentDateString = leadObj.appointmentDate ? formatTimestamp(leadObj.appointmentDate) : "";
  const pipelineStages = ["New Lead", "In Progress", "Quote Sent", "Accepted", "Rejected", "Cancelled"];

  // Determine the index of the current stage
  const currentStageIndex = pipelineStages.indexOf(leadObj.stage);

  // -------------------- RENDER --------------------
  if (!hasLead) {
    // If no lead found in location.state
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          Lead data not found.
        </Typography>
        <Button onClick={() => navigate("/my-leads")}>Go Back</Button>
      </Box>
    );
  }

  return (
    <Box className="lead-detail-mobile-container">
      {/* Header */}
      <Box className="mobile-header">
        <IconButton onClick={() => navigate("/my-leads")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">{displayedName} Lead</Typography>
      </Box>

      {/* Pipeline & Stage */}
      <Paper elevation={2} sx={{ m: 2, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Pipeline:{" "}
          <span style={{ fontWeight: "bold" }}>
            Leads Pipeline | Stage: {leadObj.stage || "New Lead"}
          </span>
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {pipelineStages.map((stgName, idx) => {
            let pillClass = "timeline-step-mobile";
            if (currentStageIndex >= 0) {
              if (idx < currentStageIndex) {
                pillClass += " done";
              } else if (idx === currentStageIndex) {
                pillClass += " active";
                if (stgName === "Rejected" || stgName === "Cancelled") {
                  pillClass += " red";
                }
              }
            }
            return (
              <Box key={stgName} className={pillClass}>
                {stgName}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: "#A7BF9F",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MenuIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Active sequence
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {leadObj.stage || "New Lead"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#27ae60", cursor: "pointer" }}
              onClick={handleOpenStageModal}
            >
              Change
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Overview Card */}
      <Paper elevation={2} className="lead-overview-card" sx={{ m: 2, p: 2 }}>
        <Typography variant="body2" sx={{ color: "#666", mb: 1 }}>
          {dealNumberString}
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Enquiry: {lead.workRequired || ""}
        </Typography>
        {lead.details && (
          <Typography variant="body2" sx={{ mb: 1, color: "#666" }}>
            {lead.details}
          </Typography>
        )}
        {lead.address && (
          <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
            {lead.address}
          </Typography>
        )}

        {/* Buttons row */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ backgroundColor: "#7D9B76" }}
            onClick={handleOpenContractModal}
          >
            Update Contract
          </Button>
          <Button
            variant="outlined"
            sx={{ minWidth: 42, borderRadius: "50%" }}
            onClick={handleOpenDateModal}
          >
            <CalendarMonthIcon fontSize="small" />
          </Button>
        </Box>

        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: "#A7BF9F",
            color: "#111",
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Contract Amount
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
            £{displayedAmount}
          </Typography>
        </Paper>

        <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600, mb: 1 }}>
          Contact Details
        </Typography>

        {/* Avatar & Name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Avatar sx={{ bgcolor: "#7D9B76" }}>
            {displayedName[0] || ""}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {displayedName}
          </Typography>
        </Box>

        {/* EMAIL ROW (Click => open email app) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Email Address:
          </Typography>
          {lead.email ? (
            <Typography variant="body2" sx={{ color: "#555" }}>
              <a
                href={`mailto:${lead.email}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {lead.email}
              </a>
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#555" }}>
              N/A
            </Typography>
          )}
        </Box>

        {/* PHONE ROW (Click => open dialer) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Phone:
          </Typography>
          {lead.phoneNumber ? (
            <Typography variant="body2" sx={{ color: "#555" }}>
              <a
                href={`tel:${lead.phoneNumber}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {lead.phoneNumber}
              </a>
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#555" }}>
              N/A
            </Typography>
          )}
        </Box>

        {/* CITY ROW (Plain text) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            City:
          </Typography>
          <Typography variant="body2" sx={{ color: "#555" }}>
            {lead.city || ""}
          </Typography>
        </Box>

        {/* Builder */}
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Builder
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: "#a4b0be" }}>
            {lead.builder?.[0] || ""}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {lead.builder || ""}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#999" }}>
          Lead created {formatTimestamp(lead.timestamp)}
        </Typography>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Lead Detail Tabs"
        >
          <Tab label="Activity" id="lead-mobile-tab-0" />
          <Tab label="Appointments" id="lead-mobile-tab-1" />
          <Tab label="Proposals" id="lead-mobile-tab-2" />
          <Tab label="Notes" id="lead-mobile-tab-3" />
          <Tab label="Project Pictures/Documents" id="lead-mobile-tab-4" />
        </Tabs>
      </Box>

      {/* ACTIVITY TAB */}
      <TabPanel value={tabIndex} index={0}>
        {leadObj.activities && leadObj.activities.length > 0 ? (
          leadObj.activities
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((act) => (
              <Box key={act.id} className="activity-row-mobile">
                <Box className="activity-icon-mobile" sx={{ bgcolor: "#A7BF9F" }}>
                  {act.title.startsWith("Stage:") ? (
                    <DoubleArrowIcon fontSize="small" />
                  ) : act.title.includes("Appointment") ? (
                    <CalendarMonthIcon fontSize="small" />
                  ) : act.title === "Contract Amount Updated" ? (
                    <AttachMoneyIcon fontSize="small" />
                  ) : act.title.startsWith("Proposal") ? (
                    <MoreVertIcon fontSize="small" />
                  ) : (
                    <DoubleArrowIcon fontSize="small" />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{act.title}</Typography>
                  <Typography sx={{ color: "#666" }}>{act.subtext}</Typography>
                </Box>
                <Typography sx={{ fontSize: "0.85rem", color: "#999" }}>
                  {formatTimestamp(act.timestamp)}
                </Typography>
              </Box>
            ))
        ) : (
          <Typography>No activity available.</Typography>
        )}
      </TabPanel>

      {/* APPOINTMENTS TAB */}
      <TabPanel value={tabIndex} index={1}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Appointments
          </Typography>
          <Button
            variant="text"
            sx={{ color: "#27ae60", textTransform: "none" }}
            onClick={handleOpenDateModal}
          >
            Create appointment
          </Button>
        </Box>
        {!leadObj.appointmentDate ? (
          <Typography sx={{ color: "#999" }}>
            No date/time selected. Please use the Create Appointment button or the calendar icon above to set an appointment.
          </Typography>
        ) : (
          <Box
            sx={{
              border: "1px solid #eaeaea",
              borderRadius: "8px",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ color: "#27ae60", fontWeight: 500 }}>{appointmentDay}</Typography>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{appointmentDateString}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircleIcon sx={{ fontSize: "0.7rem", color: "#27ae60" }} />
                <Typography>
                  On-Site Estimate with <strong>{leadObj.customerName}</strong>
                </Typography>
              </Box>
              <Typography sx={{ fontSize: "0.85rem", color: "#666" }}>
                {lead.address || "No address set"}
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "#333" }}>
                {lead.builder || "No builder assigned"}
              </Typography>
            </Box>
            <IconButton onClick={(e) => setAnchorElAppt(e.currentTarget)}>
              <MoreHorizIcon />
            </IconButton>
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
      </TabPanel>

      {/* PROPOSALS TAB */}
      <TabPanel value={tabIndex} index={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ backgroundColor: "#7D9B76", mb: 2 }}
          onClick={handleOpenProposalModal}
        >
          Create Contract
        </Button>
        {leadObj.proposals && leadObj.proposals.length > 0 ? (
          leadObj.proposals
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
              return (
                <Box
                  key={proposal.id}
                  sx={{
                    border: "1px solid #eaeaea",
                    borderRadius: "8px",
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    #{proposal.proposalNumber} - {proposal.inquiryTitle}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    Sent: {sentDateStr}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    Accepted: {acceptedDateStr}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        backgroundColor: isPending ? "#f39c12" : "#2ecc71",
                        color: "#fff",
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      {proposal.status.toUpperCase()}
                    </Button>
                    <IconButton
                      onClick={(e) => handleProposalMenuOpen(e, proposal)}
                      sx={{ ml: "auto" }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
        ) : (
          <Typography>No proposals available.</Typography>
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
      </TabPanel>

      {/* NOTES TAB */}
      <TabPanel value={tabIndex} index={3}>
        <NotesSection leadObj={leadObj} leadId={lead._id} onAddNote={handleAddNote} />
      </TabPanel>

      {/* PROJECT MEDIA TAB */}
      <TabPanel value={tabIndex} index={4}>
        <ProjectMediaTab
          media={leadObj.media || { before: [], after: [], documents: [] }}
          onSaveMedia={(newMedia) => updateLeadData({ media: newMedia })}
        />
      </TabPanel>

      {/* -------------------- MODALS -------------------- */}
      <ContractModal
        open={openContractModal}
        onClose={handleCloseContractModal}
        customerName={leadObj.customerName || lead.fullName}
        contractAmount={leadObj.contractAmount}
        onSave={handleSaveContract}
      />
      <AppointmentModal
        open={openDateModal}
        onClose={handleCloseDateModal}
        appointmentDate={leadObj.appointmentDate || null}
        onSave={handleSaveAppointment}
      />
      <StageModal
        open={openStageModal}
        onClose={handleCloseStageModal}
        currentStage={leadObj.stage || "New Lead"}
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
    </Box>
  );
}
