import React, { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { formatTimestamp } from "../utils/dateUtils";

export default function NotesSection({ leadObj, leadId, onAddNote }) {
  const [tempNote, setTempNote] = useState("");

  const handleAddNote = () => {
    const noteContent = tempNote.trim();
    if (!noteContent) return;
    onAddNote(noteContent);
    setTempNote("");
  };

  return (
    <Box className="subsection-block">
      <Typography className="subsection-title">Notes</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <TextField
          label="Add a note"
          variant="outlined"
          multiline
          rows={3}
          value={tempNote}
          onChange={(e) => setTempNote(e.target.value)}
        />
        <Button variant="contained" onClick={handleAddNote} sx={{ alignSelf: "flex-start" }}>
          Add Note
        </Button>
      </Box>
      {(leadObj.notes || [])
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((note) => (
          <Box
            key={note.id}
            sx={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              p: 2,
              mb: 1,
              backgroundColor: "#f9f9f9",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatTimestamp(note.timestamp)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {note.content}
            </Typography>
          </Box>
        ))}
    </Box>
  );
}
