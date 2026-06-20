import React from 'react';
import { Card, CardContent, Typography, Box, Chip, alpha, useTheme, Tooltip, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DataObjectIcon from '@mui/icons-material/DataObject';
import HtmlIcon from '@mui/icons-material/Html';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import type { Document } from '../../types';
import { FILE_TYPE_ICONS } from '../../utils/constants';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  canDelete?: boolean;
}

// Icon mapper helper
const getFileTypeIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  switch (type) {
    case 'pdf':
      return <PictureAsPdfIcon sx={{ fontSize: 28 }} />;
    case 'docx':
    case 'doc':
      return <DescriptionIcon sx={{ fontSize: 28 }} />;
    case 'txt':
      return <TextSnippetIcon sx={{ fontSize: 28 }} />;
    case 'md':
      return <CodeIcon sx={{ fontSize: 28 }} />;
    case 'csv':
    case 'xlsx':
      return <TableChartIcon sx={{ fontSize: 28 }} />;
    case 'pptx':
      return <SlideshowIcon sx={{ fontSize: 28 }} />;
    case 'json':
      return <DataObjectIcon sx={{ fontSize: 28 }} />;
    case 'html':
      return <HtmlIcon sx={{ fontSize: 28 }} />;
    default:
      return <InsertDriveFileIcon sx={{ fontSize: 28 }} />;
  }
};

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete, canDelete = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const fileType = document.file_type.toLowerCase();
  const config = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.default;
  const iconColor = config.color;

  const handleCardClick = () => {
    navigate(`/documents/${document.id}`);
  };

  // Map backend status to user-friendly chip color and text
  const getStatusConfig = (status: Document['status']) => {
    switch (status) {
      case 'published':
        return { label: 'COMPLETED', color: 'success' as const };
      case 'processing':
        return { label: 'PROCESSING', color: 'info' as const };
      case 'draft':
        return { label: 'PENDING', color: 'warning' as const };
      case 'archived':
        return { label: 'FAILED', color: 'error' as const };
      default:
        return { label: String(status).toUpperCase(), color: 'default' as const };
    }
  };

  const statusConfig = getStatusConfig(document.status);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formattedDate = () => {
    try {
      return format(new Date(document.created_at), 'MMM d, yyyy');
    } catch {
      return 'Recent';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        onClick={handleCardClick}
        sx={{
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha('#12122b', 0.4)
              : alpha('#ffffff', 0.8),
          borderColor:
            theme.palette.mode === 'dark'
              ? alpha(iconColor, 0.15)
              : alpha(iconColor, 0.1),
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4px',
            height: '100%',
            bgcolor: iconColor,
          },
        }}
      >
        <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* File Icon & Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: alpha(iconColor, theme.palette.mode === 'dark' ? 0.15 : 0.08),
                color: iconColor,
              }}
            >
              {getFileTypeIcon(document.file_type)}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20,
                  borderRadius: 1.5,
                }}
              />
              {onDelete && canDelete && (
                <Tooltip title="Delete Document">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(document.id, e);
                    }}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main',
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.3,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: '2.6rem',
            }}
          >
            {document.title}
          </Typography>

          {/* Metadata */}
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                Uploaded by:{' '}
                <span style={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {document.owner_name}
                </span>
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pt: 1,
                borderTop: `1px dashed ${theme.palette.divider}`,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              <span>{formattedDate()}</span>
              <span>{formatFileSize(document.file_size)}</span>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DocumentCard;
