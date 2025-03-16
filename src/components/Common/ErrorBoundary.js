import React, { Component } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Optional: Send to error tracking service
    // if (window.Sentry) {
    //   window.Sentry.captureException(error);
    // }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We're sorry, but an error occurred while rendering this component.
            </Typography>
            
            {this.props.showErrorDetails && this.state.error && (
              <Box sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="error">
                  Error: {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <Box 
                    component="pre" 
                    sx={{ 
                      mt: 1, 
                      p: 2, 
                      bgcolor: 'grey.100', 
                      borderRadius: 1,
                      overflow: 'auto',
                      fontSize: '0.75rem'
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Box>
                )}
              </Box>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => window.location.href = '/'}
              >
                Go to Home
              </Button>
              <Button 
                variant="contained" 
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 