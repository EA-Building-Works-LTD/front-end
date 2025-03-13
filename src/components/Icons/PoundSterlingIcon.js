import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

// Custom Pound Sterling Icon - Using a clearer path for the pound symbol
const PoundSterlingIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M18,12.5v-1h-4v-2h4v-1h-4c0-1.66-1.34-3-3-3c-1.66,0-3,1.34-3,3H7v1h1c0,0.55,0.45,1,1,1h4v2H8v1h4v3c0,0.55-0.45,1-1,1H7v2h10v-2h-4v-3H18z" />
  </SvgIcon>
);

export default PoundSterlingIcon; 