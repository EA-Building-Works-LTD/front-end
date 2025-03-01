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

export default function AppointmentModal({
  open,
  onClose,
  appointmentDate,
  onSave,
}) {
  const [tempAppointment, setTempAppointment] = useState(appointmentDate);

  useEffect(() => {
    setTempAppointment(appointmentDate);
  }, [appointmentDate]);

  const handleSave = () => {
    onSave(tempAppointment);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Please select appointment date/time</DialogTitle>
        <DialogContent dividers>
          <DateTimePicker
            label="Appointment Date/Time"
            value={tempAppointment}
            onChange={setTempAppointment}
            renderInput={(params) => <TextField {...params} fullWidth />}
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
