// src/components/LeadDetailDrawer.js
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import MenuIcon from "@mui/icons-material/Menu";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CircleIcon from "@mui/icons-material/Circle";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import {
  formatTimestamp,
  formatDayOfWeek,
  formatWithCommas,
} from "../utils/dateUtils";

import { v4 as uuidv4 } from "uuid";
import useLocalStorageState from "../hooks/useLocalStorageState";
import ContractModal from "./ContractModal";
import AppointmentModal from "./AppointmentModal";
import StageModal from "./StageModal";
import ProposalModal from "./ProposalModal";
import NotesSection from "./NotesSection";
import ProjectMediaTab from "./ProjectMediaTab";

import "./LeadDetailDrawer.css";

/** 
 * List of possible stages. Extracted for clarity/maintainability.
 * Make sure these match all references throughout the code.
 */
const STAGES = [
  "New Lead",
  "Quote Sent",
  "In Progress",
  "Completed",
  "Cancelled",
  "No Answer",
];

export default function LeadDetailDrawer({ open, onClose, lead }) {
  const [allLeadData, setAllLeadData] = useLocalStorageState("myLeadData", {});
  const [activeTab, setActiveTab] = useState("Activity");
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
   * Merges `changes` into the existing lead data in local storage,
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

      return {
        ...prev,
        [lead._id]: {
          ...oldData,
          ...changes,
          activities: updatedActivities,
        },
      };
    });
  }

  // Add a new proposal
  function addProposalToLead(proposal) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const oldProposals = oldData.proposals || [];
      const oldActivities = oldData.activities || [];

      const newActivities = [
        ...oldActivities,
        createActivity("Proposal Created", `Proposal #${proposal.proposalNumber} was created.`),
      ];

      return {
        ...prev,
        [lead._id]: {
          ...oldData,
          proposals: [...oldProposals, proposal],
          activities: newActivities,
        },
      };
    });
  }

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
    updateLeadData({ appointmentDate: date });
    setOpenDateModal(false);
  };

  // Stage Modal
  const handleOpenStageModal = () => {
    setOpenStageModal(true);
  };
  const handleSaveStage = (stage) => {
    updateLeadData({ stage });
    setOpenStageModal(false);
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

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          // Ensure better mobile responsiveness:
          sx: {
            width: { xs: "100vw", md: "75vw" },
          },
        }}
      >
        <Box className="drawer-topbar">
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box className="drawer-content">
          {/* LEFT COLUMN */}
          <Box className="drawer-left">
            <Typography className="deal-number">{dealNumberString}</Typography>
            <Typography className="deal-title">
              Enquiry: {lead.workRequired || ""}
            </Typography>
            <Typography className="deal-subtext">{lead.details || ""}</Typography>
            <Typography className="deal-subtext">{lead.address || ""}</Typography>

            <Box className="deal-buttons">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                  backgroundColor: "#7D9B76",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 500,
                  borderRadius: "8px",
                }}
                onClick={handleOpenContractModal}
              >
                Update Contract
              </Button>
              <Button
                variant="outlined"
                sx={{
                  minWidth: 42,
                  padding: 0,
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                }}
                onClick={handleOpenDateModal}
              >
                <CalendarMonthIcon fontSize="small" />
              </Button>
              <Button
                variant="outlined"
                sx={{
                  minWidth: 42,
                  padding: 0,
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                }}
                onClick={() => {}}
              >
                <MoreHorizIcon fontSize="small" />
              </Button>
            </Box>

            <Box className="proposal-box">
              <Box className="proposal-info">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Contract Amount
                </Typography>
                <Typography sx={{ mt: 2 }} className="proposal-amount">
                  £{displayedAmount}
                </Typography>
              </Box>
            </Box>

            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1, mt: 2 }}>
              Contact Details
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Avatar sx={{ height: "32px", width: "32px", bgcolor: "#7D9B76" }}>
                {displayedName[0] || ""}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {displayedName}
              </Typography>
            </Box>

            <Box className="contact-row">
              <EmailIcon fontSize="medium" className="contact-icon" />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Email Address
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  {lead.email || ""}
                </Typography>
              </Box>
            </Box>
            <Box className="contact-row">
              <PhoneIcon fontSize="medium" className="contact-icon" />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Phone
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  {lead.phoneNumber || ""}
                </Typography>
              </Box>
            </Box>
            <Box className="contact-row">
              <LanguageIcon fontSize="medium" className="contact-icon" />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  City
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  {lead.city || ""}
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
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
            <Typography sx={{ fontSize: "0.75rem", color: "#999" }}>
              Lead created {formatTimestamp(lead.timestamp)}
            </Typography>
          </Box>

          {/* RIGHT COLUMN */}
          <Box className="drawer-right">
            <Box className="pipeline-header">
              <Typography className="pipeline-text">
                Pipeline: <strong>Leads Pipeline</strong> | Stage:{" "}
                <strong>{leadObj.stage}</strong>
              </Typography>
            </Box>

            <Box className="timeline-container">
              {STAGES.map((stgName, idx) => {
                let pillClass = "timeline-step";
                const stgIdx = STAGES.indexOf(leadObj.stage);
                if (stgIdx >= 0) {
                  if (idx < stgIdx) pillClass += " done";
                  else if (idx === stgIdx) pillClass += " active";
                }
                return (
                  <Box key={stgName} className={pillClass}>
                    {stgName}
                  </Box>
                );
              })}
            </Box>

            <Box className="pipeline-sequence-row">
              <Box className="sequence-item">
                <Box
                  className="sequence-icon-circle"
                  style={{ backgroundColor: "#A7BF9F" }}
                >
                  <MenuIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#999" }}>
                    Active sequence
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {leadObj.stage}
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
            </Box>

            <Box className="drawer-tabs">
              {[
                "Activity",
                "Appointments",
                "Proposals",
                "Notes",
                "Project Pictures/Documents",
              ].map((tab) => (
                <Typography
                  key={tab}
                  className={`drawer-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Typography>
              ))}
            </Box>

            {/* ACTIVITY TAB */}
            {activeTab === "Activity" && (
              <Box className="subsection-block">
                <Typography className="subsection-title">Latest Activity</Typography>
                <Box className="activity-list">
                  {(leadObj.activities || [])
                    .slice()
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((act) => (
                      <Box className="activity-row" key={act.id}>
                        <Box className="activity-icon-col">
                          <Box
                            className="activity-icon-circle"
                            style={{ backgroundColor: "#A7BF9F" }}
                          >
                            {act.title.startsWith("Stage:")
                              ? <DoubleArrowIcon fontSize="small" />
                              : act.title.includes("Appointment")
                              ? <CalendarMonthIcon fontSize="small" />
                              : act.title === "Contract Amount Updated"
                              ? <AttachMoneyIcon fontSize="small" />
                              : act.title.startsWith("Proposal")
                              ? <MoreVertIcon fontSize="small" />
                              : <DoubleArrowIcon fontSize="small" />}
                          </Box>
                          <Box className="activity-line" />
                        </Box>
                        <Box className="activity-content">
                          <Typography className="activity-title">
                            {act.title}
                          </Typography>
                          <Typography className="activity-subtext">
                            {act.subtext}
                          </Typography>
                        </Box>
                        <Typography className="activity-time">
                          {formatTimestamp(act.timestamp)}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              </Box>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === "Appointments" && (
              <Box className="subsection-block">
                <Box className="section-header">
                  <Typography className="subsection-title">Appointments</Typography>
                  <Button className="create-btn" onClick={handleOpenDateModal}>
                    Create appointment
                  </Button>
                </Box>
                {!leadObj.appointmentDate && (
                  <Typography variant="body2" sx={{ color: "#999", mb: 2 }}>
                    No date/time selected. Please use the Create Appointment
                    button or click on the calendar icon next to the Update
                    Contract button to set an appointment.
                  </Typography>
                )}
                {leadObj.appointmentDate && (
                  <Box className="appointment-card">
                    <Box className="appointment-left">
                      <Typography className="appointment-day">
                        {appointmentDay}
                      </Typography>
                      <Typography className="appointment-date-h1">
                        {appointmentDateString}
                      </Typography>
                    </Box>

                    <Box className="appointment-center">
                      <Box className="appointment-title-row">
                        <CircleIcon sx={{ fontSize: "0.7rem", color: "#27ae60" }} />
                        <Typography className="appointment-title">
                          On-Site Estimate with <strong>{leadObj.customerName}</strong>
                        </Typography>
                      </Box>
                      <Typography className="appointment-location">
                        {leadObj.address || "No address set"}
                      </Typography>
                      <Typography className="appointment-person">
                        {leadObj.builder || "No builder assigned"}
                      </Typography>
                    </Box>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                      <MoreHorizIcon />
                    </IconButton>
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
              </Box>
            )}

            {/* PROPOSALS TAB */}
            {activeTab === "Proposals" && (
              <Box className="subsection-block">
                <Box className="section-header">
                  <Typography className="subsection-title">Proposals</Typography>
                  <Button className="create-btn" onClick={handleOpenProposalModal}>
                    Create Contract
                  </Button>
                </Box>

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

                    return (
                      <Box key={proposal.id} className="proposal-card2">
                        <Box className="proposal-card-left">
                          <Box className="proposal-id-row">
                            <Typography className="proposal-id">
                              #{proposal.proposalNumber}
                            </Typography>
                            <Typography className="proposal-name">
                              {proposal.inquiryTitle}
                            </Typography>
                          </Box>
                          <Box className="proposal-dates">
                            <Typography className="proposal-sent">
                              Sent date: {sentDateStr}
                            </Typography>
                            <Typography className="proposal-accepted">
                              Accepted date: {acceptedDateStr}
                            </Typography>
                          </Box>
                        </Box>
                        <Box className="proposal-card-right">
                          <Box className="proposal-amount-row">
                            <Typography className="proposal-amount-label">
                              Amount:
                            </Typography>
                            <Typography className="proposal-amount-value">
                              £{proposal.amount}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{
                                backgroundColor: isPending ? "#f39c12" : "#2ecc71",
                                color: "#fff",
                                fontWeight: 600,
                                textTransform: "none",
                                ml: 1,
                              }}
                            >
                              {proposal.status.toUpperCase()}
                            </Button>
                            <IconButton
                              className="proposal-dots"
                              onClick={(e) => handleProposalMenuOpen(e, proposal)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}

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

            {/* NOTES TAB */}
            {activeTab === "Notes" && (
              <NotesSection
                leadObj={leadObj}
                leadId={lead._id}
                onAddNote={handleAddNote}
              />
            )}

            {/* PROJECT PICTURES/DOCUMENTS TAB */}
            {activeTab === "Project Pictures/Documents" && (
              <Box className="subsection-block">
                <ProjectMediaTab
                  media={leadObj.media || { before: [], after: [], documents: [] }}
                  onSaveMedia={handleSaveMedia}
                />
              </Box>
            )}
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
    </>
  );
}
