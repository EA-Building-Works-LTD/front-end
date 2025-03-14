import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import { Visibility, VisibilityOff, Person, Email, Lock, CheckCircle } from "@mui/icons-material";
import { registerWithEmail } from "../../firebase/auth";
import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

const CreateBuilderForm = () => {
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  
  // Form validation errors
  const [errors, setErrors] = useState({});
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Success dialog
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [createdBuilderName, setCreatedBuilderName] = useState("");
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm the password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (!formData.displayName) {
      newErrors.displayName = "Display name is required";
    }
    
    return newErrors;
  };

  // Debug function to check users in Firestore
  const checkUsersInFirestore = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      console.log("Current users in Firestore:", usersSnapshot.size);
      usersSnapshot.forEach(doc => {
        console.log(`User ${doc.id}:`, doc.data());
      });
    } catch (error) {
      console.error("Error checking users:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Creating builder account with:", {
        email: formData.email,
        displayName: formData.displayName,
        role: "builder"
      });
      
      // Check users before registration
      await checkUsersInFirestore();
      
      // Register the user with builder role
      const result = await registerWithEmail(
        formData.email,
        formData.password,
        formData.displayName,
        "builder" // Set role to builder
      );
      
      console.log("Builder account creation result:", result);
      
      if (result.success) {
        // Check users after registration
        await checkUsersInFirestore();
        
        // Show success dialog
        setSuccessMessage(result.message || `Builder account created successfully for ${formData.displayName}`);
        setCreatedBuilderName(formData.displayName);
        setSuccessDialogOpen(true);
        
        // Reset form
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          displayName: "",
        });
      } else {
        // Handle error
        setErrors({ general: result.message || "Failed to create account. Please try again." });
      }
    } catch (error) {
      console.error("Error creating builder account:", error);
      
      // Handle Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ general: "Email is already in use by another account" });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: "Invalid email address format" });
      } else if (error.code === 'auth/weak-password') {
        setErrors({ password: "Password is too weak. Please use at least 6 characters" });
      } else {
        setErrors({ general: `Failed to create account: ${error.message}. Please try again.` });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle closing the success dialog
  const handleCloseSuccessDialog = () => {
    setSuccessDialogOpen(false);
  };

  return (
    <>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create Builder Account
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new builder account with access to leads assigned to them.
          </Typography>
          
          {errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.general}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label="Display Name"
              name="displayName"
              autoComplete="name"
              value={formData.displayName}
              onChange={handleChange}
              error={!!errors.displayName}
              helperText={errors.displayName}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
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
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
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
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? "Creating Account..." : "Create Builder Account"}
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      {/* Success Dialog */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseSuccessDialog}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
      >
        <DialogTitle id="success-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle color="success" sx={{ mr: 1 }} />
          Success
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="success-dialog-description">
            {createdBuilderName} builder account successfully created.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSuccessDialog} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateBuilderForm; 