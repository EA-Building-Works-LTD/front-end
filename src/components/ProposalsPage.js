// src/components/ProposalsPage.js
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { formatTimestamp } from "../utils/dateUtils";
import useLocalStorageState from "../hooks/useLocalStorageState";
import "./LeadDetailDrawer.css";

export default function ProposalsPage({ onCreateProposal }) {
  const [allLeadData, setAllLeadData] = useLocalStorageState("myLeadData", {});
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);

  // Aggregate proposals from all leads.
  // For each lead, attach the lead's ID and name for reference.
  const proposals = Object.keys(allLeadData).reduce((acc, leadId) => {
    const leadData = allLeadData[leadId];
    if (leadData.proposals && leadData.proposals.length > 0) {
      const proposalsWithLead = leadData.proposals.map((proposal) => ({
        ...proposal,
        leadId,
        leadName: leadData.customerName || "Unknown",
      }));
      return [...acc, ...proposalsWithLead];
    }
    return acc;
  }, []);

  // Sort proposals by dateSent descending
  const sortedProposals = proposals.sort((a, b) => b.dateSent - a.dateSent);

  const handleProposalMenuOpen = (e, proposal) => {
    setProposalMenuAnchor(e.currentTarget);
    setProposalMenuTarget(proposal);
  };

  const handleProposalMenuClose = () => {
    setProposalMenuAnchor(null);
    setProposalMenuTarget(null);
  };

  const handleProposalStatusChange = (newStatus) => {
    if (!proposalMenuTarget || !proposalMenuTarget.leadId) return;
    // Update the specific proposal inside its lead's data.
    setAllLeadData((prev) => {
      const leadData = prev[proposalMenuTarget.leadId];
      if (!leadData) return prev;
      const updatedProposals = leadData.proposals.map((p) =>
        p.id === proposalMenuTarget.id ? { ...p, status: newStatus } : p
      );
      return {
        ...prev,
        [proposalMenuTarget.leadId]: {
          ...leadData,
          proposals: updatedProposals,
        },
      };
    });
    handleProposalMenuClose();
  };

  return (
    <Box className="subsection-block" sx={{ p: 2 }}>
      {/* Header Section */}
      <Box
        className="section-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography className="subsection-title">Proposals</Typography>
      </Box>

      {/* Proposals Listing */}
      {sortedProposals.length === 0 ? (
        <Typography variant="body2">No proposals available.</Typography>
      ) : (
        sortedProposals.map((proposal) => {
          const sentDateStr = proposal.dateSent ? formatTimestamp(proposal.dateSent) : "—";
          const acceptedDateStr = proposal.dateAccepted ? formatTimestamp(proposal.dateAccepted) : "—";
          const isPending = proposal.status === "Pending";

          return (
            <Box
              key={`${proposal.leadId}-${proposal.id}`}
              className="proposal-card2"
              sx={{
                mb: 2,
                p: 2,
                border: "1px solid #ddd",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box className="proposal-card-left">
                <Box className="proposal-id-row" sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography className="proposal-id" sx={{ fontWeight: "bold", mr: 1 }}>
                    #{proposal.proposalNumber}
                  </Typography>
                  <Typography className="proposal-name">
                    {proposal.inquiryTitle}
                  </Typography>
                </Box>
                <Box className="proposal-dates" sx={{ fontSize: "0.875rem", color: "#555" }}>
                  <Typography className="proposal-sent">
                    Sent date: {sentDateStr}
                  </Typography>
                  <Typography className="proposal-accepted">
                    Accepted date: {acceptedDateStr}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ mt: 1, color: "#999" }}>
                  Lead: {proposal.leadName}
                </Typography>
              </Box>
              <Box className="proposal-card-right" sx={{ display: "flex", alignItems: "center" }}>
                <Box className="proposal-amount-row" sx={{ display: "flex", alignItems: "center" }}>
                  <Typography className="proposal-amount-label" sx={{ mr: 0.5 }}>
                    Amount:
                  </Typography>
                  <Typography className="proposal-amount-value" sx={{ fontWeight: 600, mr: 1 }}>
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
                      mr: 1,
                    }}
                  >
                    {proposal.status.toUpperCase()}
                  </Button>
                  <IconButton className="proposal-dots" onClick={(e) => handleProposalMenuOpen(e, proposal)}>
                    <MoreVertIcon />
                  </IconButton>
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
      </Menu>
    </Box>
  );
}
