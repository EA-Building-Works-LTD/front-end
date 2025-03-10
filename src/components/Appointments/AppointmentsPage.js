// src/pages/AppointmentsPage.js

import { Box, Typography } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
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
    // Must have an appointmentDate to be considered
    if (leadObj && leadObj.appointmentDate) {
      results.push({
        leadId,
        customerName: leadObj.customerName || "Unknown",
        address: leadObj.address || "", // same field as in LeadDetailDrawer
        builder: leadObj.builder || "", // same field
        appointmentDate: leadObj.appointmentDate,
      });
    }
  }
  // Sort by earliest appointment date
  results.sort((a, b) => a.appointmentDate - b.appointmentDate);
  return results;
}

export default function AppointmentsPage() {
  const [myLeadData] = useLocalStorageState("myLeadData", {});

  // Build the list of appointments
  const appointments = getAllAppointments(myLeadData);

  return (
    <Box className="appointments-container">
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Appointments
      </Typography>

      {appointments.length === 0 ? (
        <Typography variant="body2" sx={{ color: "#999" }}>
          No appointments found.
        </Typography>
      ) : (
        appointments.map((apt) => {
          const dayString = formatDayOfWeek(apt.appointmentDate);
          const dateString = formatTimestamp(apt.appointmentDate);

          return (
            <Box key={apt.leadId} className="appointment-card">
              {/* Left Column: Day + Date */}
              <Box className="appointment-left">
                <Typography className="appointment-day">{dayString}</Typography>
                <Typography className="appointment-date-h1">
                  {dateString}
                </Typography>
              </Box>

              {/* Center Column: Title + Address + Builder */}
              <Box className="appointment-center">
                <Box className="appointment-title-row">
                  <CircleIcon sx={{ fontSize: "0.7rem", color: "#27ae60" }} />
                  <Typography className="appointment-title">
                    On-Site Estimate with <strong>{apt.customerName}</strong>
                  </Typography>
                </Box>
                <Typography className="appointment-location">
                  {apt.address || "No address set"}
                </Typography>
                <Typography className="appointment-person">
                  {apt.builder || "No builder assigned"}
                </Typography>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
