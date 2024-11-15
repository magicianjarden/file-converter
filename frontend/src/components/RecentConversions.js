import { useEffect, useState, useContext } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Chip 
} from '@mui/material';
import { 
  AudioFile, 
  VideoFile, 
  Image, 
  Description 
} from '@mui/icons-material';
import { UserContext } from '../context/UserContext';
import { getRecentConversions } from '../services/api';

function RecentConversions() {
  const [conversions, setConversions] = useState([]);
  const { guestId } = useContext(UserContext);

  useEffect(() => {
    fetchRecentConversions();
  }, [guestId]);

  const fetchRecentConversions = async () => {
    try {
      const data = await getRecentConversions();
      setConversions(data);
    } catch (error) {
      console.error('Error fetching recent conversions:', error);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'audio':
        return <AudioFile />;
      case 'video':
        return <VideoFile />;
      case 'image':
        return <Image />;
      case 'text':
        return <Description />;
      default:
        return <Description />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Recent Conversions
      </Typography>
      
      <List>
        {conversions.map((conversion) => (
          <ListItem
            key={conversion._id}
            sx={{ borderBottom: '1px solid #eee' }}
          >
            <ListItemIcon>
              {getFileIcon(conversion.sourceType)}
            </ListItemIcon>
            <ListItemText
              primary={conversion.fileName}
              secondary={new Date(conversion.createdAt).toLocaleString()}
            />
            <Chip
              label={`${conversion.sourceType} → ${conversion.targetFormat}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default RecentConversions;