// src/LeadDetailDrawer.js
import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Chip,
  Menu,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import MenuIcon from "@mui/icons-material/Menu";
import MailIcon from "@mui/icons-material/Mail";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CircleIcon from "@mui/icons-material/Circle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import "./LeadDetailDrawer.css";

function formatTimestamp(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  let hour = date.getHours();
  let minute = date.getMinutes();
  const ampm = hour >= 12 ? "pm" : "am";
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  const minuteStr = minute < 10 ? `0${minute}` : minute;
  return `${month} ${day}, ${year} ${hour}:${minuteStr}${ampm}`;
}

function formatDayOfWeek(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { weekday: "long" });
}

function formatWithCommas(value) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "0";
  return parseInt(digits, 10).toLocaleString("en-GB");
}

const pipelineStages = [
  "New Lead",
  "In Progress",
  "Quote Sent",
  "Accepted",
  "Rejected",
  "Cancelled",
];

export default function LeadDetailDrawer({ open, onClose, lead }) {
  const [allLeadData, setAllLeadData] = useState({});
  const [activeTab, setActiveTab] = useState("Activity");
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openContractModal, setOpenContractModal] = useState(false);
  const [tempContract, setTempContract] = useState("");
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [openDateModal, setOpenDateModal] = useState(false);
  const [tempAppointment, setTempAppointment] = useState(null);
  const [openStageModal, setOpenStageModal] = useState(false);
  const [tempStage, setTempStage] = useState("New Lead");

  if (!lead || !lead._id) return null;

  let leadObj = allLeadData[lead._id];
  if (!leadObj) {
    leadObj = {
      contractAmount: "",
      stage: lead.stage || "New Lead",
      customerName: lead.fullName || "",
      appointmentDate: null,
      activities: [
        {
          id: Date.now(),
          timestamp: Date.now(),
          title: `Stage: New Lead added for ${lead.builder || "unknown"}`,
          subtext: `Lead has been submitted on ${formatTimestamp(
            lead.timestamp
          )}`,
        },
      ],
    };
    setAllLeadData((prev) => ({ ...prev, [lead._id]: leadObj }));
  }

  function updateLeadData(changes) {
    setAllLeadData((prev) => {
      const oldData = prev[lead._id] || {};
      const newData = { ...oldData, ...changes };
      let updatedActivities = oldData.activities || [];
      if ("stage" in changes && changes.stage !== oldData.stage) {
        updatedActivities = [
          ...updatedActivities,
          {
            id: Date.now(),
            timestamp: Date.now(),
            title: `Stage: ${oldData.stage} → ${changes.stage}`,
            subtext: `Lead has been moved to the ${changes.stage} stage.`,
          },
        ];
      }
      if (
        "contractAmount" in changes &&
        changes.contractAmount !== oldData.contractAmount
      ) {
        updatedActivities = [
          ...updatedActivities,
          {
            id: Date.now(),
            timestamp: Date.now(),
            title: "Contract Amount Updated",
            subtext: `Contract changed from £${
              oldData.contractAmount || "0"
            } to £${changes.contractAmount}`,
          },
        ];
      }
      if (
        Object.prototype.hasOwnProperty.call(changes, "appointmentDate") &&
        changes.appointmentDate !== oldData.appointmentDate
      ) {
        if (!changes.appointmentDate && oldData.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            {
              id: Date.now(),
              timestamp: Date.now(),
              title: "Appointment Deleted",
              subtext: "User removed the appointment date/time.",
            },
          ];
        } else if (!oldData.appointmentDate && changes.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            {
              id: Date.now(),
              timestamp: Date.now(),
              title: "Appointment Created",
              subtext: `Appointment set on ${formatTimestamp(
                changes.appointmentDate
              )}`,
            },
          ];
        } else if (oldData.appointmentDate && changes.appointmentDate) {
          updatedActivities = [
            ...updatedActivities,
            {
              id: Date.now(),
              timestamp: Date.now(),
              title: "Appointment Updated",
              subtext: `Appointment changed from ${
                formatTimestamp(oldData.appointmentDate) || "N/A"
              } to ${formatTimestamp(changes.appointmentDate)}`,
            },
          ];
        }
      }
      return {
        ...prev,
        [lead._id]: { ...newData, activities: updatedActivities },
      };
    });
  }

  const handleOpenContractModal = () => {
    setTempContract(leadObj.contractAmount || "");
    setTempCustomerName(leadObj.customerName || "");
    setOpenContractModal(true);
  };
  const handleCloseContractModal = () => setOpenContractModal(false);
  const handleSaveContract = () => {
    const finalAmount = tempContract ? formatWithCommas(tempContract) : "0";
    updateLeadData({
      contractAmount: finalAmount,
      customerName: tempCustomerName,
    });
    setOpenContractModal(false);
  };

  const handleOpenDateModal = () => {
    setTempAppointment(leadObj.appointmentDate || null);
    setOpenDateModal(true);
  };
  const handleCloseDateModal = () => setOpenDateModal(false);
  const handleSaveDate = () => {
    updateLeadData({ appointmentDate: tempAppointment });
    setOpenDateModal(false);
  };

  const handleOpenStageModal = () => {
    setTempStage(leadObj.stage || "New Lead");
    setOpenStageModal(true);
  };
  const handleCloseStageModal = () => setOpenStageModal(false);
  const handleSaveStage = () => {
    updateLeadData({ stage: tempStage });
    setOpenStageModal(false);
  };

  function handleDeleteAppointment() {
    setAnchorEl(null);
    setOpenDeleteDialog(true);
  }
  function confirmDeleteAppointment() {
    setOpenDeleteDialog(false);
    updateLeadData({ appointmentDate: null });
  }
  function cancelDeleteAppointment() {
    setOpenDeleteDialog(false);
  }

  const displayedName = leadObj.customerName || "";
  const displayedAmount = leadObj.contractAmount || "0";
  const currentStage = leadObj.stage || "New Lead";
  const stageIndex = pipelineStages.indexOf(currentStage);
  const dealNumberString = `Lead # ${formatTimestamp(lead.timestamp) || ""}`;
  const appointmentDay = leadObj.appointmentDate
    ? formatDayOfWeek(leadObj.appointmentDate)
    : "";
  const appointmentDateString = leadObj.appointmentDate
    ? formatTimestamp(leadObj.appointmentDate)
    : "";
  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          PaperProps={{ sx: { width: "75vw" } }}
        >
          <Box className="drawer-topbar">
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box className="drawer-content">
            <Box className="drawer-left">
              <Typography className="deal-number">
                {dealNumberString}
              </Typography>
              <Typography className="deal-title">
                Enquiry: {lead.workRequired || ""}
              </Typography>
              <Typography className="deal-subtext">
                {lead.details || ""}
              </Typography>
              <Typography className="deal-subtext">
                {lead.address || ""}
              </Typography>
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
              <Typography
                sx={{ fontSize: "1rem", fontWeight: 600, mb: 1, mt: 2 }}
              >
                Contact Details
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
              >
                <Avatar
                  sx={{ height: "32px", width: "32px", bgcolor: "#7D9B76" }}
                >
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
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mt: 3, mb: 1 }}
              >
                Builder
              </Typography>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
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
            <Box className="drawer-right">
              <Box className="pipeline-header">
                <Typography className="pipeline-text">
                  Pipeline: <strong>Leads Pipeline</strong> | Stage:{" "}
                  <strong>{leadObj.stage}</strong>
                </Typography>
              </Box>
              <Box className="timeline-container">
                {pipelineStages.map((stgName, idx) => {
                  let pillClass = "timeline-step";
                  const stgIdx = pipelineStages.indexOf(leadObj.stage);
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
                <Typography
                  className={`drawer-tab ${
                    activeTab === "Activity" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Activity")}
                >
                  Activity
                </Typography>
                <Typography
                  className={`drawer-tab ${
                    activeTab === "Appointments" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Appointments")}
                >
                  Appointments
                </Typography>
                <Typography
                  className={`drawer-tab ${
                    activeTab === "Proposals" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Proposals")}
                >
                  Proposals
                </Typography>
                <Typography
                  className={`drawer-tab ${
                    activeTab === "Notes" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("Notes")}
                >
                  Notes
                </Typography>
              </Box>
              {activeTab === "Activity" && (
                <Box className="subsection-block">
                  <Typography className="subsection-title">
                    Latest Activity
                  </Typography>
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
                              {act.title.startsWith("Stage:") ? (
                                <DoubleArrowIcon fontSize="small" />
                              ) : act.title.includes("Appointment") ? (
                                <CalendarMonthIcon fontSize="small" />
                              ) : act.title === "Contract Amount Updated" ? (
                                <AttachMoneyIcon fontSize="small" />
                              ) : (
                                <DoubleArrowIcon fontSize="small" />
                              )}
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
              {activeTab === "Appointments" && (
                <Box className="subsection-block">
                  <Box className="section-header">
                    <Typography className="subsection-title">
                      Appointments
                    </Typography>
                    <Button
                      className="create-btn"
                      onClick={handleOpenDateModal}
                    >
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
                          <CircleIcon
                            sx={{ fontSize: "0.7rem", color: "#27ae60" }}
                          />
                          <Typography className="appointment-title">
                            On-Site Estimate with{" "}
                            <strong>{leadObj.customerName}</strong>
                          </Typography>
                        </Box>
                        <Typography className="appointment-location">
                          {lead.address || "No address set"}
                        </Typography>
                        <Typography className="appointment-person">
                          {lead.builder || "No builder assigned"}
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
                            setTempAppointment(leadObj.appointmentDate || null);
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
              {activeTab === "Proposals" && (
                <Box className="subsection-block">
                  <Box className="section-header">
                    <Typography className="subsection-title">
                      Proposals
                    </Typography>
                    <Button className="create-btn">Create proposal</Button>
                  </Box>
                  <Box className="proposal-card2">
                    <Box className="proposal-card-left">
                      <Box className="proposal-id-row">
                        <Typography className="proposal-id">#192783</Typography>
                        <Typography className="proposal-name">
                          Paint & Drywall Repairs
                        </Typography>
                      </Box>
                      <Box className="proposal-dates">
                        <Typography className="proposal-sent">
                          Sent date: Jan 18, 2024
                        </Typography>
                        <Typography className="proposal-accepted">
                          Accepted date: —
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="proposal-card-right">
                      <Box className="proposal-amount-row">
                        <Typography className="proposal-amount-label">
                          Amount:
                        </Typography>
                        <Typography className="proposal-amount-value">
                          $2,480.00
                        </Typography>
                        <Chip
                          label="PENDING"
                          size="small"
                          sx={{
                            bgcolor: "#f39c12",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        />
                        <IconButton className="proposal-dots">
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
              {activeTab === "Notes" && (
                <Box className="subsection-block">
                  <Typography className="subsection-title">Notes</Typography>
                  <Typography variant="body2" sx={{ color: "#666" }}>
                    Here you can display any notes or a text area, etc.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Drawer>
        <Dialog open={openContractModal} onClose={handleCloseContractModal}>
          <DialogTitle>Update Contract</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Customer Name"
              fullWidth
              variant="outlined"
              margin="normal"
              value={tempCustomerName}
              onChange={(e) => setTempCustomerName(e.target.value)}
            />
            <TextField
              label="Contract Amount"
              fullWidth
              variant="outlined"
              margin="normal"
              value={tempContract}
              onChange={(e) => setTempContract(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseContractModal}>Cancel</Button>
            <Button onClick={handleSaveContract} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openDateModal} onClose={handleCloseDateModal}>
          <DialogTitle>Please select appointment date/time</DialogTitle>
          <DialogContent dividers>
            <DateTimePicker
              label="Appointment Date/Time"
              value={tempAppointment}
              onChange={(newValue) => setTempAppointment(newValue)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDateModal}>Cancel</Button>
            <Button onClick={handleSaveDate} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openStageModal} onClose={handleCloseStageModal}>
          <DialogTitle>Change Lead Stage</DialogTitle>
          <DialogContent dividers>
            <Select
              fullWidth
              variant="outlined"
              value={tempStage}
              onChange={(e) => setTempStage(e.target.value)}
            >
              {pipelineStages.map((stage) => (
                <MenuItem key={stage} value={stage}>
                  {stage}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseStageModal}>Cancel</Button>
            <Button onClick={handleSaveStage} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Delete Appointment</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2">
              Are you sure you want to delete the appointment?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={confirmDeleteAppointment}>
              Yes, Delete
            </Button>
          </DialogActions>
        </Dialog>
      </>
    </LocalizationProvider>
  );
}
