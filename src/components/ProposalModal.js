import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { formatTimestamp } from "../utils/dateUtils";

export default function ProposalModal({ open, onClose, proposal, onSave }) {
  const [tempProposal, setTempProposal] = useState(proposal);

  useEffect(() => {
    setTempProposal(proposal);
  }, [proposal]);

  const handleSave = () => {
    onSave(tempProposal);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Create Contract</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Contract Number"
            fullWidth
            variant="outlined"
            margin="normal"
            value={tempProposal.proposalNumber}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Enquiry"
            fullWidth
            variant="outlined"
            margin="normal"
            value={tempProposal.inquiryTitle}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Date Sent"
            fullWidth
            variant="outlined"
            margin="normal"
            value={tempProposal.dateSent ? formatTimestamp(tempProposal.dateSent) : ""}
            InputProps={{ readOnly: true }}
          />
          <DateTimePicker
            label="Accepted Date (optional)"
            value={tempProposal.dateAccepted}
            onChange={(newValue) =>
              setTempProposal((prev) => ({ ...prev, dateAccepted: newValue }))
            }
            renderInput={(params) => (
              <TextField {...params} fullWidth margin="normal" />
            )}
          />
          <TextField
            label="Status"
            fullWidth
            variant="outlined"
            margin="normal"
            value={tempProposal.status}
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Amount"
            fullWidth
            variant="outlined"
            margin="normal"
            value={tempProposal.amount}
            onChange={(e) =>
              setTempProposal((prev) => ({ ...prev, amount: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
