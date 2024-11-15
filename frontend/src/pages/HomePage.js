import React from 'react';
import { Box, Container } from '@mui/material';
import FileConverter from '../components/FileConverter';

const HomePage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <FileConverter />
      </Box>
    </Container>
  );
};

export default HomePage;