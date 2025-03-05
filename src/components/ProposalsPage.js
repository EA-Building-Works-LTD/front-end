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
import './LeadDetailDrawer.css';

export default function ProposalsPage({ onCreateProposal }) {
  const [allLeadData, setAllLeadData] = useLocalStorageState("myLeadData", {});
  const [proposalMenuAnchor, setProposalMenuAnchor] = useState(null);
  const [proposalMenuTarget, setProposalMenuTarget] = useState(null);

  // Gather proposals from all leads, tagging each with leadId & leadName
  const proposals = Object.keys(allLeadData).reduce((acc, leadId) => {
    const leadData = allLeadData[leadId];
    if (leadData?.proposals?.length > 0) {
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
    <Box className="subsection-block" sx={{ p: { xs: 1, sm: 2 } }}>
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
        {/* e.g. If you want a create button:
          <Button variant="contained" onClick={onCreateProposal}>
            Create Proposal
          </Button>
        */}
      </Box>

      {sortedProposals.length === 0 ? (
        <Typography variant="body2">No proposals available.</Typography>
      ) : (
        sortedProposals.map((proposal) => {
          const sentDateStr = proposal.dateSent
            ? formatTimestamp(proposal.dateSent)
            : "—";
          const acceptedDateStr = proposal.dateAccepted
            ? formatTimestamp(proposal.dateAccepted)
            : "—";
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
                // On phones, stack vertically; on tablets+ go row
                display: "flex",
                flexDirection: {
                  xs: "column",
                  sm: "row",
                },
                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },
                justifyContent: "space-between",
                gap: 2, // spacing when wrapping
              }}
            >
              {/* Left side: proposal info */}
              <Box
                className="proposal-card-left"
                sx={{ width: { xs: "100%", sm: "60%" } }}
              >
                <Box
                  className="proposal-id-row"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    className="proposal-id"
                    sx={{ fontWeight: "bold", mr: 1 }}
                  >
                    #{proposal.proposalNumber}
                  </Typography>
                  <Typography className="proposal-name">
                    {proposal.inquiryTitle}
                  </Typography>
                </Box>
                <Box
                  className="proposal-dates"
                  sx={{ fontSize: "0.875rem", color: "#555", mb: 1 }}
                >
                  <Typography
                    className="proposal-sent"
                    sx={{ display: "inline-block", mr: 2 }}
                  >
                    Sent date: {sentDateStr}
                  </Typography>
                  <Typography
                    className="proposal-accepted"
                    sx={{ display: "inline-block" }}
                  >
                    Accepted date: {acceptedDateStr}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#999" }}>
                  Lead: {proposal.leadName}
                </Typography>
              </Box>

              {/* Right side: amount + status + menu */}
              <Box
                className="proposal-card-right"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  // On mobile, left-aligned; on tablets+ push to the end
                  justifyContent: {
                    xs: "flex-start",
                    sm: "flex-end",
                  },
                  width: { xs: "100%", sm: "40%" },
                }}
              >
                <Box
                  className="proposal-amount-row"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    className="proposal-amount-label"
                    sx={{ mr: 0.5 }}
                  >
                    Amount:
                  </Typography>
                  <Typography
                    className="proposal-amount-value"
                    sx={{ fontWeight: 600, mr: 1 }}
                  >
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
                      mb: { xs: 1, sm: 0 },
                    }}
                  >
                    {proposal.status.toUpperCase()}
                  </Button>
                  <IconButton
                    className="proposal-dots"
                    onClick={(e) => handleProposalMenuOpen(e, proposal)}
                    sx={{
                      // Ensure the icon is right next to the button
                      mr: { xs: 0, sm: 0 },
                    }}
                  >
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
