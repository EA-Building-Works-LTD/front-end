import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a single file to the Cloudinary upload API.
 * Returns the secure URL on success.
 */
async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:3001/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export default function CloudinaryUploader() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMsg("");
    const filesArray = Array.from(files);

    try {
      const uploaded = await Promise.all(
        filesArray.map(async (file) => {
          const url = await uploadFile(file);
          return {
            id: uuidv4(),
            name: file.name,
            url, // Cloudinary URL returned by the API
          };
        })
      );
      setUploadedFiles((prev) => [...prev, ...uploaded]);
    } catch (error) {
      setErrorMsg("One or more files failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Upload Files to Cloudinary
      </Typography>
      <Button variant="contained" component="label">
        Select Files
        <input
          type="file"
          multiple
          hidden
          onChange={handleFileChange}
        />
      </Button>
      {uploading && (
        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
          Uploading...
        </Typography>
      )}
      {errorMsg && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {errorMsg}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        {uploadedFiles.length > 0 ? (
          uploadedFiles.map((file) => (
            <Box key={file.id} sx={{ mb: 1, p: 1, border: "1px solid #ddd", borderRadius: "4px" }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {file.name}
              </Typography>
              <Typography variant="body2">
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.url}
                </a>
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            No files uploaded yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
