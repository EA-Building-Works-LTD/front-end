import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

export default function AppointmentModal({
  open,
  onClose,
  appointmentDate,
  onSave,
}) {
  // Convert Firestore timestamp to Date object if needed
  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date();
    
    // Handle Firestore timestamp objects (with seconds and nanoseconds)
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Handle regular timestamp (number)
    return new Date(timestamp);
  };

  const [tempAppointment, setTempAppointment] = useState(convertToDate(appointmentDate));

  useEffect(() => {
    // Ensure we're always working with a valid Date object
    setTempAppointment(convertToDate(appointmentDate));
  }, [appointmentDate]);

  const handleSave = () => {
    // Ensure we're passing a valid timestamp to the parent component
    if (tempAppointment && tempAppointment instanceof Date && !isNaN(tempAppointment)) {
      onSave(tempAppointment.getTime());
    } else {
      console.error("Invalid appointment date:", tempAppointment);
      onSave(new Date().getTime()); // Fallback to current time if invalid
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Please select appointment date/time</DialogTitle>
        <DialogContent dividers sx={{ width: "350px", pt: 2 }}>
          <DateTimePicker
            label="Appointment Date/Time"
            value={tempAppointment}
            onChange={(newValue) => {
              if (newValue && !isNaN(new Date(newValue).getTime())) {
                setTempAppointment(newValue);
              }
            }}
            slotProps={{ textField: { fullWidth: true } }}
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
