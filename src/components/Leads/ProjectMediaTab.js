import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useSwipeable } from "react-swipeable";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a single file to the Cloudinary backend API, passing the "category"
 * so the server can store PDFs as raw if category=documents or mimetype=pdf.
 */
async function uploadFile(file, category) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category); // Pass category to the server

  try {
    const response = await fetch("https://cloudinary-backend-nr0w.onrender.com/upload", {
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

/**
 * ImageGallery displays a horizontal slider for a category of images.
 */
function ImageGallery({ files, category, onDelete, onImageClick }) {
  const visibleCount = 3;
  const imageWidth = 150;
  const gap = 16;
  const [sliderIndex, setSliderIndex] = useState(0);
  const maxIndex = Math.max(files.length - visibleCount, 0);

  const handlePrev = () => setSliderIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setSliderIndex((prev) => Math.min(prev + 1, maxIndex));

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrev(),
    trackMouse: true,
  });

  return (
    <Box position="relative" {...swipeHandlers} overflow="hidden">
      {/* Left Arrow */}
      <IconButton
        onClick={handlePrev}
        disabled={sliderIndex === 0}
        sx={{
          position: "absolute",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          zIndex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          color: "#fff",
          "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
        }}
      >
        <ArrowBackIosIcon />
      </IconButton>
      {/* Right Arrow */}
      <IconButton
        onClick={handleNext}
        disabled={sliderIndex >= maxIndex}
        sx={{
          position: "absolute",
          top: "50%",
          right: 0,
          transform: "translateY(-50%)",
          zIndex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          color: "#fff",
          "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
        }}
      >
        <ArrowForwardIosIcon />
      </IconButton>

      <Box
        sx={{
          display: "flex",
          gap: `${gap}px`,
          transition: "transform 0.3s ease-out",
          transform: `translateX(-${sliderIndex * (imageWidth + gap)}px)`,
        }}
      >
        {files.map((file, index) => (
          <Box key={file.id} sx={{ flex: "0 0 auto" }}>
            <Box position="relative">
              <img
                src={file.url}
                alt={file.name}
                style={{
                  width: `${imageWidth}px`,
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => onImageClick(category, index, files)}
              />
              <IconButton
                onClick={() => onDelete(category, file.id)}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "rgba(255, 0, 0, 0.8)",
                  color: "#fff",
                  padding: "4px",
                  borderRadius: "50%",
                  "&:hover": { backgroundColor: "rgba(255, 0, 0, 1)" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * FullScreenImageViewer displays a full‑screen preview of images.
 */
function FullScreenImageViewer({ open, files, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, files.length - 1));
  }, [files.length]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "Escape") onClose();
    },
    [handlePrev, handleNext, onClose]
  );

  React.useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrev(),
    trackMouse: true,
  });

  if (!files || files.length === 0) return null;

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { backgroundColor: "#000" } }}>
      <Box
        sx={{
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        {...swipeHandlers}
      >
        {/* Left Arrow */}
        <IconButton
          onClick={handlePrev}
          disabled={currentIndex === 0}
          sx={{
            position: "absolute",
            left: 16,
            color: "#fff",
            backgroundColor: "rgba(0,0,0,0.4)",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
          }}
        >
          <ArrowBackIosIcon />
        </IconButton>
        <Box
          component="img"
          src={files[currentIndex].url}
          alt={files[currentIndex].name}
          sx={{
            maxWidth: "90%",
            maxHeight: "90%",
            borderRadius: "4px",
          }}
        />
        {/* Right Arrow */}
        <IconButton
          onClick={handleNext}
          disabled={currentIndex === files.length - 1}
          sx={{
            position: "absolute",
            right: 16,
            color: "#fff",
            backgroundColor: "rgba(0,0,0,0.4)",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
          }}
        >
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>
    </Dialog>
  );
}

export default function ProjectMediaTab({ media = {}, onSaveMedia }) {
  const [beforeFiles, setBeforeFiles] = useState(media.before || []);
  const [afterFiles, setAfterFiles] = useState(media.after || []);
  const [documentFiles, setDocumentFiles] = useState(media.documents || []);
  const [openFullViewer, setOpenFullViewer] = useState(false);
  const [viewerFiles, setViewerFiles] = useState([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Update parent media state manually.
  const updateParentMedia = (newMedia) => {
    onSaveMedia(newMedia);
  };

  /**
   * Handle file upload: pass the "category" so the server knows if it's
   * "before", "after", or "documents" and can store PDFs as raw.
   */
  const handleFileUpload = async (e, category) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          // Pass category to the uploadFile function
          const url = await uploadFile(file, category);
          return {
            id: uuidv4(),
            name: file.name,
            type: file.type,
            url, // Cloudinary URL returned from the server
          };
        })
      );

      if (category === "before") {
        setBeforeFiles((prev) => {
          const newState = [...prev, ...uploadedFiles];
          updateParentMedia({ before: newState, after: afterFiles, documents: documentFiles });
          return newState;
        });
      } else if (category === "after") {
        setAfterFiles((prev) => {
          const newState = [...prev, ...uploadedFiles];
          updateParentMedia({ before: beforeFiles, after: newState, documents: documentFiles });
          return newState;
        });
      } else if (category === "documents") {
        setDocumentFiles((prev) => {
          const newState = [...prev, ...uploadedFiles];
          updateParentMedia({ before: beforeFiles, after: afterFiles, documents: newState });
          return newState;
        });
      }
    } catch (error) {
      console.error("File upload failed", error);
    }
  };

  /**
   * Handle deleting an uploaded file from the local state.
   */
  const handleDelete = (category, fileId) => {
    if (category === "before") {
      setBeforeFiles((prev) => {
        const newState = prev.filter((file) => file.id !== fileId);
        updateParentMedia({ before: newState, after: afterFiles, documents: documentFiles });
        return newState;
      });
    } else if (category === "after") {
      setAfterFiles((prev) => {
        const newState = prev.filter((file) => file.id !== fileId);
        updateParentMedia({ before: beforeFiles, after: newState, documents: documentFiles });
        return newState;
      });
    } else if (category === "documents") {
      setDocumentFiles((prev) => {
        const newState = prev.filter((file) => file.id !== fileId);
        updateParentMedia({ before: beforeFiles, after: afterFiles, documents: newState });
        return newState;
      });
    }
  };

  /**
   * Open the full-screen image viewer when an image is clicked.
   */
  const handleImageClick = (category, index, files) => {
    setViewerFiles(files);
    setViewerInitialIndex(index);
    setOpenFullViewer(true);
  };

  const handleCloseFullViewer = () => {
    setOpenFullViewer(false);
    setViewerFiles([]);
    setViewerInitialIndex(0);
  };

  /**
   * For PDFs, force download by inserting "fl_attachment" into the URL path.
   */
  function getDownloadUrl(file) {
    let url = file.url;
    // If it's a PDF, we want to force a download
    if (file.name.toLowerCase().endsWith(".pdf")) {
      if (url.includes("/raw/upload/")) {
        // Resource is stored as raw => "raw/upload/fl_attachment/"
        if (!url.includes("/fl_attachment/")) {
          url = url.replace("/raw/upload/", "/raw/upload/fl_attachment/");
        }
      } else if (url.includes("/image/upload/")) {
        // Resource is stored as image => "image/upload/fl_attachment/"
        if (!url.includes("/fl_attachment/")) {
          url = url.replace("/image/upload/", "/image/upload/fl_attachment/");
        }
      }
    }
    return url;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Project Pictures/Documents
      </Typography>

      {/* Before Pictures Section */}
      <Box mt={2}>
        <Typography variant="subtitle1">Before Pictures</Typography>
        <Button variant="contained" component="label">
          Upload Before Picture
          <input
            type="file"
            accept="image/*"
            hidden
            multiple
            onChange={(e) => handleFileUpload(e, "before")}
          />
        </Button>
        <Box mt={1}>
          {beforeFiles.length > 0 ? (
            <ImageGallery
              files={beforeFiles}
              category="before"
              onDelete={handleDelete}
              onImageClick={handleImageClick}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              No before pictures uploaded.
            </Typography>
          )}
        </Box>
      </Box>

      {/* After Pictures Section */}
      <Box mt={2}>
        <Typography variant="subtitle1">After Pictures</Typography>
        <Button variant="contained" component="label">
          Upload After Picture
          <input
            type="file"
            accept="image/*"
            hidden
            multiple
            onChange={(e) => handleFileUpload(e, "after")}
          />
        </Button>
        <Box mt={1}>
          {afterFiles.length > 0 ? (
            <ImageGallery
              files={afterFiles}
              category="after"
              onDelete={handleDelete}
              onImageClick={handleImageClick}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              No after pictures uploaded.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Documents Section */}
      <Box mt={2}>
        <Typography variant="subtitle1">Documents</Typography>
        <Button variant="contained" component="label">
          Upload Document
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            hidden
            multiple
            onChange={(e) => handleFileUpload(e, "documents")}
          />
        </Button>
        <Box mt={1}>
          {documentFiles.length > 0 ? (
            documentFiles.map((file) => (
              <Box
                key={file.id}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={1}
                border="1px solid #ddd"
                borderRadius="4px"
                mb={1}
              >
                <Typography variant="body2">{file.name}</Typography>
                <Box>
                  <IconButton
                    component="a"
                    href={getDownloadUrl(file)}
                    download={file.name}
                    sx={{ color: "#1976d2" }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete("documents", file.id)}
                    sx={{ color: "red" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No documents uploaded.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Full Screen Image Viewer */}
      <FullScreenImageViewer
        open={openFullViewer}
        files={viewerFiles}
        initialIndex={viewerInitialIndex}
        onClose={handleCloseFullViewer}
      />
    </Box>
  );
}
