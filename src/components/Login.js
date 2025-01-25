import React, { useState, useEffect } from "react";
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
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Disable scrolling for the entire page
    document.documentElement.style.overflow = "hidden"; // For <html>
    document.documentElement.style.height = "100%"; // Set full height for <html>
    document.body.style.overflow = "hidden"; // For <body>
    document.body.style.height = "100%"; // Set full height for <body>
    document.body.style.margin = "0"; // Ensure no margins contribute to scrolling

    return () => {
      // Re-enable scrolling when unmounting the component
      document.documentElement.style.overflow = "auto";
      document.documentElement.style.height = "auto";
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      document.body.style.margin = "initial";
    };
  }, []);

  const handleLogin = async () => {
    try {
      const sanitizedUsername = credentials.username.toLowerCase(); // Convert username to lowercase
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login`,
        { ...credentials, username: sanitizedUsername } // Send the sanitized username
      );
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
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px", // Add padding for smaller screens
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          "@media (max-width: 768px)": {
            maxWidth: "90%", // Adjust width for tablets
          },
          "@media (max-width: 480px)": {
            maxWidth: "100%", // Adjust width for mobile
            padding: "0 16px", // Add horizontal padding on mobile
          },
        }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            padding: "32px",
            "@media (max-width: 768px)": {
              padding: "24px", // Reduce padding for tablets
            },
            "@media (max-width: 480px)": {
              padding: "16px", // Reduce padding for mobile
            },
          }}
        >
          <CardContent>
            <Box
              component="img"
              src="/EABuildingWorksLTD.png"
              alt="EA Building Works LTD"
              sx={{
                width: 220,
                height: "auto",
                marginBottom: "16px",
                display: "block",
                margin: "0 auto",
                "@media (max-width: 480px)": {
                  width: 180, // Adjust logo size for mobile
                },
              }}
            />
            <Box sx={{ marginBottom: "16px" }}>
              <LoginIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                marginBottom: "8px",
                fontSize: "1.5rem",
                "@media (max-width: 480px)": {
                  fontSize: "1.25rem", // Adjust font size for mobile
                },
              }}
            >
              Login With Your Credentials
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                marginBottom: "24px",
                fontSize: "0.875rem",
                "@media (max-width: 480px)": {
                  fontSize: "0.75rem", // Adjust font size for mobile
                },
              }}
            >
              Please contact admin if you do not have an account or if you have
              forgotten your password.
            </Typography>

            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  username:
                    e.target.value.trim().charAt(0).toLowerCase() +
                    e.target.value.slice(1), // Ensure the first letter is lowercase
                })
              }
              sx={{
                "@media (max-width: 480px)": {
                  marginBottom: "16px", // Add spacing for mobile
                },
              }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              sx={{
                "@media (max-width: 480px)": {
                  marginBottom: "24px", // Add spacing for mobile
                },
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                padding: "12px 0",
                marginTop: "16px",
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#333" },
                "@media (max-width: 480px)": {
                  padding: "10px 0", // Adjust padding for mobile
                  fontSize: "0.875rem", // Adjust font size for mobile
                },
              }}
            >
              Login
            </Button>
            {error && (
              <Typography
                variant="body2"
                color="red"
                align="center"
                sx={{
                  marginTop: "16px",
                  fontSize: "0.875rem",
                  "@media (max-width: 480px)": {
                    fontSize: "0.75rem", // Adjust font size for mobile
                  },
                }}
              >
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
