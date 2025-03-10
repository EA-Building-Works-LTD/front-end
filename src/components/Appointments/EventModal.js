import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const eventTypes = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'reminder', label: 'Reminder' },
];

const recurrenceFrequencies = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

export default function EventModal({ open, onClose, event, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    type: 'appointment',
    isRecurring: false,
    recurrence: {
      frequency: 'WEEKLY',
      interval: 1,
      endDate: null,
    },
  });

  useEffect(() => {
    if (event) {
      setFormData(prev => ({
        ...event,
        isRecurring: !!event.recurrence,
        recurrence: event.recurrence || prev.recurrence,
      }));
    }
  }, [event]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      id: event?.id,
    };

    // Only include recurrence data if it's a recurring event
    if (!formData.isRecurring) {
      delete eventData.recurrence;
    }

    onSave(eventData);
  };

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {event?.id ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={handleChange('title')}
                required
                fullWidth
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                multiline
                rows={3}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={handleChange('type')}
                  label="Event Type"
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <DateTimePicker
                label="Start Date & Time"
                value={formData.start}
                onChange={(newValue) => {
                  setFormData(prev => ({ ...prev, start: newValue }));
                }}
              />

              <DateTimePicker
                label="End Date & Time"
                value={formData.end}
                onChange={(newValue) => {
                  setFormData(prev => ({ ...prev, end: newValue }));
                }}
                minDateTime={formData.start}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecurring}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        isRecurring: e.target.checked,
                      }));
                    }}
                  />
                }
                label="Recurring Event"
              />

              {formData.isRecurring && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.recurrence.frequency}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          recurrence: {
                            ...prev.recurrence,
                            frequency: e.target.value,
                          },
                        }));
                      }}
                      label="Frequency"
                    >
                      {recurrenceFrequencies.map(freq => (
                        <MenuItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    type="number"
                    label="Interval"
                    value={formData.recurrence.interval}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        recurrence: {
                          ...prev.recurrence,
                          interval: parseInt(e.target.value) || 1,
                        },
                      }));
                    }}
                    InputProps={{ inputProps: { min: 1 } }}
                  />

                  <DateTimePicker
                    label="Repeat Until"
                    value={formData.recurrence.endDate}
                    onChange={(newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        recurrence: {
                          ...prev.recurrence,
                          endDate: newValue,
                        },
                      }));
                    }}
                    minDateTime={formData.start}
                  />
                </Box>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}