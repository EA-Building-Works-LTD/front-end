import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
} from "@mui/material";

const pipelineStages = [
  "New Lead",
  "In Progress",
  "Quote Sent",
  "Accepted",
  "Rejected",
  "Cancelled",
];

export default function StageModal({ open, onClose, currentStage, onSave }) {
  const [tempStage, setTempStage] = useState(currentStage || "New Lead");

  useEffect(() => {
    setTempStage(currentStage || "New Lead");
  }, [currentStage]);

  const handleSave = () => {
    onSave(tempStage);
  };

  return (
    <Dialog open={open} onClose={onClose}>
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
