import { addDays, addWeeks, addMonths } from 'date-fns';

const RECURRENCE_PATTERNS = {
  DAILY: (date, interval) => addDays(date, interval),
  WEEKLY: (date, interval) => addWeeks(date, interval),
  MONTHLY: (date, interval) => addMonths(date, interval),
};

function generateRecurringEvents(event) {
  if (!event.recurrence) return [event];

  const events = [event];
  let currentDate = new Date(event.start);
  const endDate = event.recurrence.endDate || addMonths(currentDate, 6); // Default to 6 months if no end date

  while (currentDate < endDate) {
    currentDate = RECURRENCE_PATTERNS[event.recurrence.frequency](
      currentDate,
      event.recurrence.interval
    );

    if (currentDate <= endDate) {
      const duration = new Date(event.end) - new Date(event.start);
      events.push({
        ...event,
        id: `${event.id}-${events.length}`,
        start: new Date(currentDate),
        end: new Date(currentDate.getTime() + duration),
      });
    }
  }

  return events;
}

export function formatCalendarEvents(leadData, filters) {
  const events = [];

  Object.entries(leadData).forEach(([leadId, lead]) => {
    // Add appointments
    if (filters.showAppointments && lead.appointmentDate) {
      const appointmentEnd = new Date(lead.appointmentDate);
      appointmentEnd.setHours(appointmentEnd.getHours() + 1);

      events.push({
        id: `apt-${leadId}`,
        title: `Appointment with ${lead.customerName}`,
        description: `${lead.address || 'No address'}\n${lead.builder || 'No builder assigned'}`,
        start: new Date(lead.appointmentDate),
        end: appointmentEnd,
        type: 'appointment',
        leadId,
      });
    }

    // Add deadlines (e.g., from proposals)
    if (filters.showDeadlines && lead.proposals) {
      lead.proposals.forEach((proposal, index) => {
        if (proposal.dueDate) {
          events.push({
            id: `deadline-${leadId}-${index}`,
            title: `Proposal Due: ${proposal.proposalNumber}`,
            description: `Proposal due for ${lead.customerName}`,
            start: new Date(proposal.dueDate),
            end: new Date(proposal.dueDate),
            type: 'deadline',
            leadId,
          });
        }
      });
    }
  });

  // Handle recurring events
  const expandedEvents = events.flatMap(event => generateRecurringEvents(event));

  return expandedEvents;
}