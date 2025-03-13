// src/pages/AppointmentsPage.js

import React from "react";
import { Box, Typography, Chip, Divider } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventIcon from "@mui/icons-material/Event";
import TodayIcon from "@mui/icons-material/Today";
import { useNavigate } from "react-router-dom";
import useLocalStorageState from '../../hooks/useLocalStorageState';
import { formatDayOfWeek, formatTimestamp } from '../../utils/dateUtils';
import "./AppointmentsPage.css";

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
    
    // Log the appointment and lead ID for debugging
    console.log("Appointment clicked:", appointment);
    console.log("Lead ID:", appointment.leadId);
    console.log("myLeadData keys:", Object.keys(myLeadData));
    console.log("Complete lead data from storage:", completeLeadData);
    
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
    
    // Log the lead data for navigation
    console.log("Lead data for navigation:", leadForNavigation);
    
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
            <div 
              key={`today-${index}`}
              className="appointment-card today-card"
              onClick={() => handleAppointmentClick(apt)}
            >
              <div className="appointment-left">
                <Typography className="appointment-day">
                  {formatDayOfWeek(apt.appointmentDate)}
                </Typography>
                <Typography className="appointment-date-h1">
                  {formatTimestamp(apt.appointmentDate)}
                </Typography>
              </div>
              
              <div className="appointment-center">
                <div className="appointment-title-row">
                  <Typography className="appointment-title">
                    On-Site Estimate with <strong>{apt.customerName}</strong>
                  </Typography>
                </div>
                <Typography className="appointment-location">
                  {apt.address || "No address set"}
                </Typography>
                <Typography className="appointment-person">
                  {apt.builderName || "No builder assigned"}
                </Typography>
              </div>
              
              <Box className="appointment-right">
                <ChevronRightIcon color="action" />
              </Box>
            </div>
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
              <div 
                key={index}
                className="appointment-card"
                onClick={() => handleAppointmentClick(apt)}
              >
                <div className="appointment-left">
                  <Typography className="appointment-day">
                    {formatDayOfWeek(apt.appointmentDate)}
                  </Typography>
                  <Typography className="appointment-date-h1">
                    {formatTimestamp(apt.appointmentDate)}
                  </Typography>
                </div>
                
                <div className="appointment-center">
                  <div className="appointment-title-row">
                    <Typography className="appointment-title">
                      On-Site Estimate with <strong>{apt.customerName}</strong>
                    </Typography>
                  </div>
                  <Typography className="appointment-location">
                    {apt.address || "No address set"}
                  </Typography>
                  <Typography className="appointment-person">
                    {apt.builderName || "No builder assigned"}
                  </Typography>
                </div>
                
                <Box className="appointment-right">
                  <ChevronRightIcon color="action" />
                </Box>
              </div>
            ))}
        </>
      ) : (
        <Typography variant="body1" style={{ textAlign: 'center', marginTop: '32px', color: '#666' }}>
          No appointments scheduled yet.
        </Typography>
      )}
    </div>
  );
}
