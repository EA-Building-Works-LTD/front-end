import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import {
  Box,
  Typography,
  Dialog,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import useLocalStorageState from '../../hooks/useLocalStorageState';
import EventModal from '../Appointments/EventModal';
import CalendarFilters from './CalendarFilters';
import { formatCalendarEvents } from './calendarUtils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  // State management
  const [myLeadData] = useLocalStorageState("myLeadData", {});
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    showAppointments: true,
    showDeadlines: true,
    showReminders: true,
  });

  // Convert appointments to calendar events
  useEffect(() => {
    try {
      setLoading(true);
      const formattedEvents = formatCalendarEvents(myLeadData, filters);
      setEvents(formattedEvents);
      setError(null);
    } catch (err) {
      setError('Failed to load calendar events. Please try again.');
      console.error('Calendar loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [myLeadData, filters]);

  // Memoized calendar event styles
  const eventPropGetter = useMemo(() => {
    return (event) => {
      let style = {
        backgroundColor: '#7D9B76',  // Default color
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block'
      };

      // Custom styles based on event type
      switch (event.type) {
        case 'appointment':
          style.backgroundColor = '#27ae60';
          break;
        case 'deadline':
          style.backgroundColor = '#e74c3c';
          break;
        case 'reminder':
          style.backgroundColor = '#f39c12';
          break;
        default:
          break;
      }

      return { 
        style,
        className: `event-${event.type}`,
        'data-event-type': event.type
      };
    };
  }, []);

  // Event handlers
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }) => {
    setSelectedEvent({
      start,
      end,
      title: '',
      type: 'appointment'
    });
    setIsEventModalOpen(true);
  };

  const handleEventSave = async (eventData) => {
    try {
      // Update local storage and state
      const updatedEvents = [...events];
      
      if (eventData.id) {
        // Update existing event
        const index = updatedEvents.findIndex(e => e.id === eventData.id);
        if (index !== -1) {
          updatedEvents[index] = eventData;
        }
      } else {
        // Add new event
        updatedEvents.push({
          ...eventData,
          id: Date.now().toString()
        });
      }

      setEvents(updatedEvents);
      setIsEventModalOpen(false);
      
      // Sync with backend (if applicable)
      // await saveEventToBackend(eventData);
    } catch (err) {
      setError('Failed to save event. Please try again.');
      console.error('Event save error:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="calendar-container">
      {/* Header */}
      <Box className="calendar-header">
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Calendar
        </Typography>
        <Box className="calendar-actions">
          <Tooltip title="Add Event">
            <IconButton 
              onClick={() => setIsEventModalOpen(true)}
              className="add-event-button"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filters">
            <IconButton 
              onClick={() => setIsFilterModalOpen(true)}
              className="filter-button"
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Calendar */}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100vh - 200px)' }}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventPropGetter}
        views={['month', 'week', 'day', 'agenda']}
        defaultView="month"
        tooltipAccessor={event => event.description || event.title}
        popup
      />

      {/* Event Modal */}
      <EventModal
        open={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSave={handleEventSave}
      />

      {/* Filters Modal */}
      <Dialog
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      >
        <CalendarFilters
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setIsFilterModalOpen(false)}
        />
      </Dialog>
    </Box>
  );
}