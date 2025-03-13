// src/pages/AppointmentsPage.js

import React from "react";
import { 
  Box, 
  Typography, 
  Chip, 
  Divider, 
  IconButton,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import TodayIcon from "@mui/icons-material/Today";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import useLocalStorageState from '../../hooks/useLocalStorageState';
import "./AppointmentsPage.css";

// Helper function to format the full appointment date
function formatFullAppointmentDate(timestamp) {
  if (!timestamp) return "No date set";
  
  const date = new Date(timestamp);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  // Add ordinal suffix to day
  const dayStr = day + (
    day === 1 || day === 21 || day === 31 ? 'st' : 
    day === 2 || day === 22 ? 'nd' : 
    day === 3 || day === 23 ? 'rd' : 'th'
  );
  
  return `${dayName} ${dayStr} ${month} ${year} @ ${hours}:${minutesStr}${ampm}`;
}

/**
 * Gather all appointments from local storage.
 * We rely on leadObj.address/builder, which must
 * be stored in LeadDetailDrawer's "initialLeadObj".
 */
function getAllAppointments(myLeadData) {
  const results = [];
  for (const leadId in myLeadData) {
    const leadObj = myLeadData[leadId];
    // Check if the lead has an appointmentDate
    if (leadObj && leadObj.appointmentDate) {
      results.push({
        leadId,  // This is the key in myLeadData
        customerName: leadObj.customerName || "Unknown",
        address: leadObj.address || "", 
        builderName: leadObj.builderName || "",
        appointmentDate: leadObj.appointmentDate,
        // Include all fields from the lead object
        ...leadObj,
        // Ensure these specific fields are set correctly
        email: leadObj.email || "",
        phoneNumber: leadObj.phoneNumber || "",
        city: leadObj.city || "",
        workRequired: leadObj.workRequired || "",
        details: leadObj.details || "",
        timestamp: leadObj.timestamp || Date.now(),
        stage: leadObj.stage || "New Lead"
      });
    }
    
    // Also check if the lead has an appointments array
    if (leadObj && leadObj.appointments && leadObj.appointments.length > 0) {
      leadObj.appointments.forEach(appointment => {
        results.push({
          leadId,  // This is the key in myLeadData
          customerName: leadObj.customerName || "Unknown",
          address: leadObj.address || "",
          builderName: leadObj.builderName || "",
          appointmentDate: appointment.appointmentDate,
          // Include all fields from the lead object
          ...leadObj,
          // Ensure these specific fields are set correctly
          email: leadObj.email || "",
          phoneNumber: leadObj.phoneNumber || "",
          city: leadObj.city || "",
          workRequired: leadObj.workRequired || "",
          details: leadObj.details || "",
          timestamp: leadObj.timestamp || Date.now(),
          stage: leadObj.stage || "New Lead"
        });
      });
    }
  }
  
  // Sort by earliest appointment date
  results.sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
  return results;
}

/**
 * Check if an appointment is today
 */
function isToday(dateString) {
  const today = new Date();
  const appointmentDate = new Date(dateString);
  
  return (
    today.getDate() === appointmentDate.getDate() &&
    today.getMonth() === appointmentDate.getMonth() &&
    today.getFullYear() === appointmentDate.getFullYear()
  );
}

export default function AppointmentsPage() {
  const [myLeadData] = useLocalStorageState("myLeadData", {});
  const navigate = useNavigate();
  
  // Build the list of appointments
  const appointments = getAllAppointments(myLeadData);
  
  // Filter today's appointments
  const todayAppointments = appointments.filter(apt => isToday(apt.appointmentDate));
  const todayCount = todayAppointments.length;
  
  // Function to handle appointment click
  const handleAppointmentClick = (appointment) => {
    // Get the complete lead data from myLeadData
    const completeLeadData = myLeadData[appointment.leadId] || {};
    
    // Create a properly structured lead object for navigation
    // We need to include ALL fields that the LeadDetailMobile component expects
    const leadForNavigation = {
      // First spread the complete lead data to include all fields
      ...completeLeadData,
      // Then add the required fields for navigation, using the complete lead data as the primary source
      _id: appointment.leadId,
      fullName: completeLeadData.customerName || appointment.customerName || "Unknown",
      builder: completeLeadData.builderName || appointment.builderName || "",
      address: completeLeadData.address || appointment.address || "",
      timestamp: completeLeadData.timestamp || appointment.timestamp || Date.now(),
      stage: completeLeadData.stage || appointment.stage || "New Lead",
      email: completeLeadData.email || appointment.email || "",
      phoneNumber: completeLeadData.phoneNumber || appointment.phoneNumber || "",
      city: completeLeadData.city || appointment.city || "",
      workRequired: completeLeadData.workRequired || appointment.workRequired || "No Enquiry",
      details: completeLeadData.details || appointment.details || ""
    };
    
    // Create a URL-friendly slug from the customer name (same as in MyLeads.js)
    const slugify = (text) => {
      return (
        text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "")
          .replace(/--+/g, "-") + "-lead"
      );
    };
    
    const slug = slugify(leadForNavigation.fullName || "unknown");
    
    // Navigate to the lead detail page with the lead data
    navigate(`/my-leads/${slug}`, { state: { lead: leadForNavigation } });
  };
  
  // Render empty state when no appointments
  const renderEmptyState = () => (
    <Box className="appointment-empty">
      <CalendarTodayIcon className="appointment-empty-icon" />
      <Typography variant="body1" className="appointment-empty-text">
        No appointments scheduled yet
      </Typography>
    </Box>
  );
  
  return (
    <div className="appointments-container">
      {/* Header with today's count */}
      <div className="appointments-header">
        <Typography variant="h5" component="h1" style={{ fontWeight: 600 }}>
          Appointments
        </Typography>
        
        <div className="today-appointments">
          <TodayIcon style={{ color: '#2A9D8F', marginRight: '8px' }} />
          <Typography variant="body1" style={{ marginRight: '8px' }}>
            Today:
          </Typography>
          <Chip 
            label={todayCount} 
            color="primary" 
            size="small" 
            style={{ 
              backgroundColor: todayCount > 0 ? '#2A9D8F' : '#999',
              fontWeight: 'bold'
            }} 
          />
        </div>
      </div>
      
      {/* Today's appointments section */}
      {todayCount > 0 && (
        <div className="today-section">
          <Typography 
            variant="subtitle1" 
            style={{ 
              fontWeight: 600, 
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <EventIcon style={{ marginRight: '8px', color: '#2A9D8F' }} />
            Today's Appointments
          </Typography>
          
          {todayAppointments.map((apt, index) => (
            <Box 
              key={`today-${index}`}
              className="appointment-card-simple today-card"
              onClick={() => handleAppointmentClick(apt)}
            >
              <Box className="appointment-header">
                <Box className="appointment-title-container">
                  <Typography className="appointment-type">
                    On-Site Estimate
                  </Typography>
                </Box>
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAppointmentClick(apt);
                  }}
                  sx={{ color: 'white' }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>
              
              <Box className="appointment-content">
                <Box className="appointment-with">
                  <PersonIcon className="appointment-with-icon" />
                  <Typography>
                    Meeting with <strong>{apt.customerName || "Unknown"}</strong>
                  </Typography>
                </Box>
                
                <Box className="appointment-datetime">
                  <CalendarTodayIcon className="appointment-datetime-icon" />
                  <Typography>
                    {formatFullAppointmentDate(apt.appointmentDate)}
                  </Typography>
                </Box>
                
                <Box className="appointment-location">
                  <LocationOnIcon className="appointment-location-icon" />
                  <Typography>
                    {apt.address || "No address set"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </div>
      )}
      
      {/* Divider between today and upcoming */}
      {todayCount > 0 && appointments.length > todayCount && <Divider style={{ margin: '24px 0' }} />}
      
      {/* All appointments */}
      {appointments.length > 0 ? (
        <>
          {(todayCount > 0) && (
            <Typography 
              variant="subtitle1" 
              style={{ 
                fontWeight: 600, 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <EventIcon style={{ marginRight: '8px', color: '#666' }} />
              Upcoming Appointments
            </Typography>
          )}
          
          {appointments
            .filter(apt => !isToday(apt.appointmentDate))
            .map((apt, index) => (
              <Box 
                key={index}
                className="appointment-card-simple"
                onClick={() => handleAppointmentClick(apt)}
              >
                <Box className="appointment-header">
                  <Box className="appointment-title-container">
                    <Typography className="appointment-type">
                      On-Site Estimate
                    </Typography>
                  </Box>
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAppointmentClick(apt);
                    }}
                    sx={{ color: 'white' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
                
                <Box className="appointment-content">
                  <Box className="appointment-with">
                    <PersonIcon className="appointment-with-icon" />
                    <Typography>
                      Meeting with <strong>{apt.customerName || "Unknown"}</strong>
                    </Typography>
                  </Box>
                  
                  <Box className="appointment-datetime">
                    <CalendarTodayIcon className="appointment-datetime-icon" />
                    <Typography>
                      {formatFullAppointmentDate(apt.appointmentDate)}
                    </Typography>
                  </Box>
                  
                  <Box className="appointment-location">
                    <LocationOnIcon className="appointment-location-icon" />
                    <Typography>
                      {apt.address || "No address set"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
        </>
      ) : (
        renderEmptyState()
      )}
    </div>
  );
}
