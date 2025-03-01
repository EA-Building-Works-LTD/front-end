import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

export default function ContractModal({
  open,
  onClose,
  customerName,
  contractAmount,
  onSave,
}) {
  const [tempCustomerName, setTempCustomerName] = useState(customerName);
  const [tempContract, setTempContract] = useState(contractAmount);

  useEffect(() => {
    setTempCustomerName(customerName);
    setTempContract(contractAmount);
  }, [customerName, contractAmount]);

  const handleSave = () => {
    onSave(tempCustomerName, tempContract);
  };

  return (
    <Dialog open={open} onClose={onClose}>
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
