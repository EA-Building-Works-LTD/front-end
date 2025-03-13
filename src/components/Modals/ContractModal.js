import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";

export default function ContractModal({
  open,
  onClose,
  customerName,
  contractAmount,
  profit,
  onSave,
}) {
  const [tempCustomerName, setTempCustomerName] = useState(customerName);
  const [tempContract, setTempContract] = useState(contractAmount);
  const [tempProfit, setTempProfit] = useState(profit || "0");
  const [calculatedFee, setCalculatedFee] = useState("0");

  useEffect(() => {
    setTempCustomerName(customerName);
    setTempContract(contractAmount);
    setTempProfit(profit || "0");
  }, [customerName, contractAmount, profit]);

  // Calculate 10% fee whenever profit changes
  useEffect(() => {
    if (tempProfit) {
      const profitValue = Number(tempProfit.replace(/,/g, ''));
      if (!isNaN(profitValue)) {
        const fee = (profitValue * 0.1).toFixed(2);
        setCalculatedFee(fee);
      } else {
        setCalculatedFee("0");
      }
    } else {
      setCalculatedFee("0");
    }
  }, [tempProfit]);

  const handleSave = () => {
    onSave(tempCustomerName, tempContract, tempProfit);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Price Breakdown</DialogTitle>
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
          label="Total Contract Value"
          fullWidth
          variant="outlined"
          margin="normal"
          value={tempContract}
          onChange={(e) => setTempContract(e.target.value)}
        />
        <TextField
          label="Profit"
          fullWidth
          variant="outlined"
          margin="normal"
          value={tempProfit}
          onChange={(e) => setTempProfit(e.target.value)}
          helperText="Enter the profit amount for this job"
        />
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Calculated Fee (10% of Profit)
          </Typography>
          <Typography variant="h6" color="primary">
            £{calculatedFee}
          </Typography>
        </Box>
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
