import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';

import DocumentViewer from '../components/documents/DocumentViewer';

const DocumentViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Redirect if ID is missing (should not happen with proper routing)
  if (!id) {
    navigate('/search');
    return null;
  }

  return (
    <Container maxWidth="xl" disableGutters>
      <Box sx={{ py: { xs: 1, sm: 2 } }}>
        <DocumentViewer documentId={id} />
      </Box>
    </Container>
  );
};

export default DocumentViewerPage;
