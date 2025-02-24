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
    document.documentElement.style.overflow = "hidden"; 
    document.documentElement.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.margin = "0";

    return () => {
      // Re-enable scrolling when unmounting
      document.documentElement.style.overflow = "auto";
      document.documentElement.style.height = "auto";
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      document.body.style.margin = "initial";
    };
  }, []);

  const handleLogin = async () => {
    try {
      console.log("Login credentials submitted:", credentials);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login`,
        credentials
      );
      console.log("Login response:", response.data);
      const { token, role } = response.data;

      // Store token & role in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      // If parent keeps track of the user, set it here
      setUser && setUser({ role });

      // Redirect based on role
      if (role === "admin") {
        navigate("/dashboard");
      } else if (role === "builder") {
        // For builders, go to MyLeads page
        navigate("/my-leads");
      }
    } catch (err) {
      console.error("Error during login:", err.response?.data || err.message);
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
        padding: "16px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          "@media (max-width: 768px)": {
            maxWidth: "90%",
          },
          "@media (max-width: 480px)": {
            maxWidth: "100%",
            padding: "0 16px",
          },
        }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            padding: "32px",
            "@media (max-width: 768px)": {
              padding: "24px",
            },
            "@media (max-width: 480px)": {
              padding: "16px",
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
                  width: 180,
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
                  fontSize: "1.25rem",
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
                  fontSize: "0.75rem",
                },
              }}
            >
              Please contact admin if you do not have an account or if you have
              forgotten your password.
            </Typography>

            {/* Username */}
            <TextField
              label="Username"
              fullWidth
              margin="normal"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              sx={{
                "@media (max-width: 480px)": {
                  marginBottom: "16px",
                },
              }}
            />
            {/* Password */}
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
                  marginBottom: "24px",
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
                  padding: "10px 0",
                  fontSize: "0.875rem",
                },
              }}
            >
              Login
            </Button>
            {/* Error message */}
            {error && (
              <Typography
                variant="body2"
                color="red"
                align="center"
                sx={{
                  marginTop: "16px",
                  fontSize: "0.875rem",
                  "@media (max-width: 480px)": {
                    fontSize: "0.75rem",
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
