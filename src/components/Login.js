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
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login`,
        credentials
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
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 500,
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
            <Box
              component="img"
              src="/EABuildingWorksLTD.png"
              alt="EA Building Works LTD"
              sx={{
                width: 220,
                height: "auto",
                mb: 2,
                display: "block",
                mx: "auto",
              }}
            />

            <Box sx={{ mb: 1 }}>
              <LoginIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            </Box>

            <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
              Login With Your Credentials
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please contact admin if you do not have an account or if you have
              forgotten your password.
            </Typography>

            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
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
            />

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

            {error && (
              <Typography
                variant="body2"
                color="red"
                align="center"
                sx={{ mt: 2 }}
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
