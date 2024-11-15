import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { CompareArrows } from '@mui/icons-material';

const Navigation = () => {
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CompareArrows 
            sx={{ 
              color: 'primary.main',
              fontSize: 32,
            }} 
          />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              color: 'text.primary',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            File Converter
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;