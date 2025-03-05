import React from 'react';
import {
  Box,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

export default function CalendarFilters({ filters, onFilterChange, onClose }) {
  const handleFilterChange = (filterName) => (event) => {
    onFilterChange({
      ...filters,
      [filterName]: event.target.checked,
    });
  };

  return (
    <Box>
      <DialogTitle>Calendar Filters</DialogTitle>
      <DialogContent>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showAppointments}
                onChange={handleFilterChange('showAppointments')}
              />
            }
            label="Show Appointments"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showDeadlines}
                onChange={handleFilterChange('showDeadlines')}
              />
            }
            label="Show Deadlines"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.showReminders}
                onChange={handleFilterChange('showReminders')}
              />
            }
            label="Show Reminders"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Box>
  );
}