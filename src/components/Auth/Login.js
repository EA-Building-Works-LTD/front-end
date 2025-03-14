// src/components/Login.js
import React, { useState, useEffect, useRef } from "react";
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
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff, AccountCircle, Lock } from "@mui/icons-material";
import { loginWithEmail, resetPassword } from "../../firebase/auth";

export default function Login({ setUser }) {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  const navigate = useNavigate();
  const emailRef = useRef(null);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Focus on email field if there's an error
  useEffect(() => {
    if (error && emailRef.current) {
      emailRef.current.focus();
    }
  }, [error]);

  // Handle user login
  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      setError("Please fill in both fields");
      return;
    }
    setLoading(true);
    setError("");

    try {
      console.log(`Attempting to log in as ${credentials.email}...`);
      
      const { user, role } = await loginWithEmail(credentials.email, credentials.password);
      
      console.log(`Login successful. User:`, user);
      console.log(`User role:`, role);
      
      // If "Remember me" is checked, store the email in localStorage
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", credentials.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      if (setUser) {
        console.log(`Setting user in App.js:`, { user, role });
        setUser({ user, role });
      }

      // Navigate based on role
      if (role === "admin") {
        console.log(`Navigating to /dashboard (admin)`);
        navigate("/dashboard");
      } else if (role === "builder") {
        console.log(`Navigating to /my-leads (builder)`);
        navigate("/my-leads");
      } else {
        console.log(`Unknown role: ${role}, defaulting to /my-leads`);
        navigate("/my-leads");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(getFirebaseErrorMessage(err.code) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking "Forgot" links
  const handleForgotPassword = async () => {
    if (!credentials.email) {
      setError("Please enter your email address");
      return;
    }
    
    try {
      await resetPassword(credentials.email);
      setSnackbarMessage("Password reset email sent. Please check your inbox.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code) || "Failed to send reset email");
    }
  };

  // Toggle password visibility
  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Get user-friendly error message from Firebase error code
  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address format';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      case 'auth/email-already-in-use':
        return 'Email is already in use by another account';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters';
      default:
        return null;
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 3,
        backgroundColor: "#f5f5f5",
      }}
    >
      <CssBaseline />
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Welcome to CRM
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          value={credentials.email}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          inputRef={emailRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          id="password"
          autoComplete="current-password"
          value={credentials.password}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={toggleShowPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            mt: 1,
            mb: 2,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                value="remember"
                color="primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Remember me"
          />
          <Button
            variant="text"
            color="primary"
            onClick={handleForgotPassword}
            sx={{ textTransform: "none" }}
          >
            Forgot password?
          </Button>
        </Box>

        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          disabled={loading}
          sx={{ mt: 2, mb: 2 }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
