import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// --- MUI Imports ---
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";

const Login = ({ setUser }) => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, credentials);
      const { token, role } = response.data;

      // Save token and role in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      setUser({ role });

      // Redirect based on role
      if (role === "admin") {
        navigate("/leads");
      } else if (role === "builder") {
        navigate("/builders");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <Box
      sx={{
        // Use full viewport height; ensures no extra scroll
        // height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        // remove extra page-level padding so it doesn't push content
        // p: 2, // optional
      }}
    >
      {/* Outer container for Card */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 500,  // slightly smaller than 600 to reduce vertical growth
          textAlign: "center",
        }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            p: 4,
          }}
        >
          <CardContent>
            {/* Logo (inside the card) */}
            <Box
              component="img"
              src="/EABuildingWorksLTD.png"
              alt="EA Building Works LTD"
              sx={{
                width: 220,      // slightly smaller to help fit on smaller screens
                height: "auto",
                mb: 2,           // spacing below logo
                display: "block",
                mx: "auto",
              }}
            />

            {/* Login icon above the title */}
            <Box sx={{ mb: 1 }}>
              <LoginIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            </Box>

            {/* Title / Subtitle */}
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
              Sign in with email
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Make a new doc to bring your words, data, and teams together. For free
            </Typography>

            {/* Email Field */}
            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
            />

            {/* Password Field */}
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
            />

            {/* Login Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                py: 1.2,
                mt: 3,
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#333" },
              }}
            >
              Login
            </Button>

            {/* Show error message if any */}
            {error && (
              <Typography variant="body2" color="red" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Login;
