// src/components/ProposalsPage.js

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PersonIcon from "@mui/icons-material/Person";
import { formatTimestamp } from "../utils/dateUtils";
import useLocalStorageState from "../hooks/useLocalStorageState";
import './Leads/LeadDetailMobile.css';
import { auth } from "../firebase/config";
import { useUserRole } from "../components/Auth/UserRoleContext";
import { updateLead } from "../firebase/leads";
import { toast } from 'react-toastify';

export default function ProposalsPage({ onCreateProposal }) {
  const [allLeadData, setAllLeadData] = useLocalStorageState("myLeadData", {});
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const userRole = useUserRole();
  const isAdmin = userRole === "admin" || userRole?.isAdmin === true || userRole?.role === "admin";
  const currentUserId = auth.currentUser?.uid;
  console.log("Current user ID:", currentUserId);
  console.log("Is admin:", isAdmin);

  // Log user role for debugging
  useEffect(() => {
    console.log("User role in ProposalsPage:", userRole);
    console.log("Current user:", auth.currentUser?.email);
    setLoading(false);
  }, [userRole]);

  // Gather proposals from all leads, tagging each with leadId & leadName
  const proposals = Object.keys(allLeadData).reduce((acc, leadId) => {
    const leadData = allLeadData[leadId];
    if (leadData?.proposals?.length > 0) {
      const proposalsWithLead = leadData.proposals.map((proposal) => {
        // Log each proposal for debugging
        console.log(`Proposal: ${proposal.proposalNumber}, BuilderId: ${proposal.builderId}, Current user: ${currentUserId}`);
        
        return {
          ...proposal,
          leadId,
          leadName: leadData.customerName || "Unknown",
          // If the proposal doesn't have a builderId, use the creator of the lead 
          // or currentUserId as a fallback
          builderId: proposal.builderId || leadData.builderId || currentUserId
        };
      });
      return [...acc, ...proposalsWithLead];
    }
    return acc;
  }, []);

  console.log("All proposals:", proposals.length);

  // Filter proposals for admin vs. builder role
  const filteredProposals = isAdmin 
    ? proposals // Admins see all proposals
    : proposals.filter(proposal => {
        const matches = proposal.builderId === currentUserId;
        console.log(`Filtering proposal ${proposal.proposalNumber}: builderId=${proposal.builderId}, currentUserId=${currentUserId}, matches=${matches}`);
        return matches;
      });

  console.log("Filtered proposals:", filteredProposals.length);

  // Sort proposals by dateSent descending
  const sortedProposals = filteredProposals.sort((a, b) => b.dateSent - a.dateSent);

  const handleProposalMenuOpen = (e, proposal) => {
    setProposalMenuAnchor(e.currentTarget);
    setProposalMenuTarget(proposal);
  };

  const handleProposalMenuClose = () => {
    setProposalMenuAnchor(null);
    setProposalMenuTarget(null);
  };

  const handleProposalStatusChange = async (newStatus) => {
    if (!proposalMenuTarget || !proposalMenuTarget.leadId) return;
    
    try {
      // Update the specific proposal inside its lead's data
      const leadId = proposalMenuTarget.leadId;
      const leadData = allLeadData[leadId];
      
      if (!leadData) return;
      
      const updatedProposals = leadData.proposals.map((p) => {
        if (p.id === proposalMenuTarget.id) {
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
      
      // Create activity log entry
      const statusActivity = {
        id: Date.now(),
        timestamp: Date.now(),
        title: "Proposal Status Updated",
        subtext: `Proposal #${proposalMenuTarget.proposalNumber} changed status from ${proposalMenuTarget.status} to ${newStatus}`,
      };
      
      const updatedActivities = [...(leadData.activities || []), statusActivity];
      
      // Update local state first for immediate UI feedback
      setAllLeadData((prev) => ({
        ...prev,
        [leadId]: {
          ...leadData,
          proposals: updatedProposals,
          activities: updatedActivities,
        },
      }));
      
      // Update in Firebase
      await updateLead(leadId, {
        proposals: updatedProposals,
        activities: updatedActivities
      });
      
      toast.success(`Proposal status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating proposal status:", error);
      toast.error("Failed to update proposal status. Please try again.");
    }
    
    handleProposalMenuClose();
  };

  const handleDeleteProposalConfirm = () => {
    setOpenDeleteDialog(true);
  };

  const handleDeleteProposal = async () => {
    if (!proposalMenuTarget || !proposalMenuTarget.leadId) return;
    
    try {
      const leadId = proposalMenuTarget.leadId;
      const leadData = allLeadData[leadId];
      
      if (!leadData) return;
      
      // Filter out the proposal with the given ID
      const updatedProposals = leadData.proposals.filter(
        (p) => p.id !== proposalMenuTarget.id
      );
      
      // Add activity log entry
      const deleteActivity = {
        id: Date.now(),
        timestamp: Date.now(),
        title: "Proposal Deleted",
        subtext: `Proposal #${proposalMenuTarget.proposalNumber} was deleted.`,
      };
      
      const updatedActivities = [...(leadData.activities || []), deleteActivity];
      
      // Update local state first for immediate UI feedback
      setAllLeadData((prev) => ({
        ...prev,
        [leadId]: {
          ...leadData,
          proposals: updatedProposals,
          activities: updatedActivities,
        },
      }));
      
      // Update in Firebase
      await updateLead(leadId, {
        proposals: updatedProposals,
        activities: updatedActivities
      });
      
      toast.success("Proposal deleted successfully");
    } catch (error) {
      console.error("Error deleting proposal:", error);
      toast.error("Failed to delete proposal. Please try again.");
    }
    
    setOpenDeleteDialog(false);
    handleProposalMenuClose();
  };

  const cancelDeleteProposal = () => {
    setOpenDeleteDialog(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="subsection-block" sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header Section */}
      <Box
        className="section-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          p: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isAdmin ? "All Proposals" : "My Proposals"}
        </Typography>
      </Box>

      {sortedProposals.length === 0 ? (
        <Box className="empty-state">
          <DescriptionIcon sx={{ fontSize: 48, color: '#E0E0E0', mb: 2 }} />
          <Typography sx={{ color: "#757575", mb: 1 }}>No proposals available</Typography>
          <Typography variant="body2" sx={{ color: "#9E9E9E", textAlign: "center", mb: 2 }}>
            Create proposals from your lead details page
          </Typography>
        </Box>
      ) : (
        sortedProposals.map((proposal) => {
          const sentDateStr = proposal.dateSent
            ? formatTimestamp(proposal.dateSent)
            : "—";
          const acceptedDateStr = proposal.status === "Completed" 
            ? (proposal.dateAccepted ? formatTimestamp(proposal.dateAccepted) : formatTimestamp(Date.now()))
            : proposal.status === "Pending" 
              ? "Pending" 
              : "—";
          const isPending = proposal.status === "Pending";

          return (
            <Box
              key={`${proposal.leadId}-${proposal.id}`}
              className="proposal-card"
            >
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
                  <PersonIcon className="proposal-date-icon" />
                  <Box>
                    <Typography className="proposal-date-label">Customer:</Typography>
                    <Typography className="proposal-date-value">{proposal.leadName}</Typography>
                  </Box>
                </Box>
                
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
      )}

      {/* Proposal Status Menu */}
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
          onClick={handleDeleteProposalConfirm}
          sx={{ color: 'error.main' }}
        >
          Delete Proposal
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={cancelDeleteProposal}>
        <DialogTitle>Delete Proposal</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to delete this proposal? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteProposal}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteProposal}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
