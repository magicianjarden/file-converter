import { Box, LinearProgress, Typography } from '@mui/material';

function ConversionProgress({ progress, status }) {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ mb: 1 }}
      />
      <Typography variant="body2" color="text.secondary" align="center">
        {status}
      </Typography>
    </Box>
  );
}

export default ConversionProgress;