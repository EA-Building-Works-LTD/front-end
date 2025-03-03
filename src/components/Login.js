// src/components/Login.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  CssBaseline,
  Snackbar,
  Alert,
} from "@mui/material";

export default function Login({ setUser }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [roleFromStorage, setRoleFromStorage] = useState(null);
  const [usernameFromStorage, setUsernameFromStorage] = useState("");

  const navigate = useNavigate();
  const usernameRef = useRef(null);

  // State for showing "Forgot" messages in a Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Load role & username from localStorage (if already logged in) and check if "rememberMe" was set
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");
    if (storedRole) setRoleFromStorage(storedRole);
    if (storedUsername) setUsernameFromStorage(storedUsername);

    // Check if user previously chose to remember their username
    const remembered = localStorage.getItem("rememberMe") === "true";
    const rememberedUsername = localStorage.getItem("rememberedUsername");
    if (remembered && rememberedUsername) {
      setRememberMe(true);
      setCredentials((prev) => ({ ...prev, username: rememberedUsername }));
    }
  }, []);

  // Focus on username field if there's an error
  useEffect(() => {
    if (error && usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [error]);

  // Handle user login
  const handleLogin = async () => {
    if (!credentials.username || !credentials.password) {
      setError("Please fill in both fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login`,
        credentials
      );
      const { token, role } = response.data;

      // Store the token, role, and username in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("username", credentials.username);

      // If "Remember me" is checked, store the username
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedUsername", credentials.username);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedUsername");
      }

      if (setUser) {
        setUser({ role });
      }

      // Navigate based on role
      if (role === "admin") {
        navigate("/dashboard");
      } else if (role === "builder") {
        navigate("/my-leads");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking "Forgot" links
  const handleForgotMessage = (type) => {
    let message = "";
    if (type === "username") {
      message =
        "Forgot Username?\nPlease contact admin at eabuildingworksltd@gmail.com";
    } else if (type === "password") {
      message =
        "Forgot Password?\nPlease contact admin at eabuildingworksltd@gmail.com";
    }
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Close Snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setSnackbarMessage("");
  };

  // Decide welcome text based on role
  let welcomeText = "Welcome";
  if (roleFromStorage === "builder") {
    welcomeText = `Welcome ${usernameFromStorage}`;
  } else if (roleFromStorage === "admin") {
    welcomeText = "Welcome Admin";
  }

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          width: "100vw",
          height: "100vh",
          overflow: "hidden", // Keep overall no-scroll design
        }}
      >
        {/* Left Column (form + disclaimers) */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { xs: 2, sm: 4, md: 6 },
          }}
        >
          {/* Top row: brand logo */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <img
                src="/EABuildingWorksLTD.png"
                alt="EA Building Works"
                style={{ width: 120, height: "auto" }}
              />
            </Box>
          </Box>

          {/* Middle content */}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
              {welcomeText}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
              Sign in to your EA Building Works account
            </Typography>

            {/* Username */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Username
            </Typography>
            <TextField
              placeholder="Geoffrey Mott"
              variant="outlined"
              fullWidth
              inputRef={usernameRef}
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              sx={{ mb: 2 }}
            />

            {/* Password */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Password
            </Typography>
            <TextField
              placeholder="********"
              variant="outlined"
              fullWidth
              type="password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              sx={{ mb: 2 }}
            />

            {/* Remember me + Forgot links */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                }
                label="Remember me"
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => handleForgotMessage("username")}
                >
                  Forgot Username?
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => handleForgotMessage("password")}
                >
                  Forgot Password?
                </Typography>
              </Box>
            </Box>

            {/* Login button */}
            <Button
              variant="contained"
              sx={{
                width: "100%",
                py: 1.2,
                fontWeight: "bold",
                backgroundColor: "#7D9B76",
                "&:hover": {
                  backgroundColor: "#6c8c67",
                },
              }}
              onClick={handleLogin}
            >
              {loading ? "Loading..." : "Login"}
            </Button>

            {/* Error message */}
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>

          {/* Footer disclaimers */}
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            © 2025 EA Building Works. All rights reserved.
          </Typography>
        </Box>

        {/* Right Column: big house image (hidden on mobile) */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "#eee",
            backgroundImage: 'url("/LoginImage.jpg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: { xs: "none", md: "block" },
            borderRadius: "25px",
            margin: "15px",
          }}
        />
      </Box>

      {/* Snackbar for "Forgot" messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="info"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
