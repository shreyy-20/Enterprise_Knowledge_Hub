import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  LinearProgress,
  IconButton,
  alpha,
  useTheme,
  FormHelperText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import toast from 'react-hot-toast';

import apiClient from '../../api/client';
import { useDocuments } from '../../hooks/useDocuments';
import type { Project } from '../../types';
import { ACCEPTED_EXTENSIONS } from '../../utils/constants';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, uploading, uploadProgress } = useDocuments();

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock projects as fallback
  const mockProjects: Project[] = [
    {
      id: 'proj-rag',
      name: 'RAG Integration Engine',
      description: 'Retrieval Augmented Generation pipelines',
      status: 'active',
      department_id: 'dept-eng',
      members: [],
      created_at: new Date().toISOString(),
    },
    {
      id: 'proj-ekh',
      name: 'Enterprise Knowledge Hub',
      description: 'Internal documentation indexer',
      status: 'active',
      department_id: 'dept-prod',
      members: [],
      created_at: new Date().toISOString(),
    },
    {
      id: 'proj-analytics',
      name: 'Global Analytics Suite',
      description: 'Analytics dashboards and trend trackers',
      status: 'active',
      department_id: 'dept-data',
      members: [],
      created_at: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get<Project[]>('/projects');
        if (response.data && Array.isArray(response.data)) {
          setProjects(response.data);
        } else {
          setProjects(mockProjects);
        }
      } catch {
        // Fallback to mock projects on error
        setProjects(mockProjects);
      }
    };

    if (open) {
      fetchProjects();
    }
  }, [open]);

  // Reset form when modal closes or opens
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setTitle('');
      setProjectId('');
      setErrors({});
    }
  }, [open]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error(`Invalid file format. Supported extensions: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    // Auto-fill title with the file name (without extension)
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    setTitle(nameWithoutExt);

    // Clear file error if any
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }
    if (!title.trim()) {
      newErrors.title = 'Document title is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile!);
    formData.append('title', title.trim());
    if (projectId) {
      formData.append('project_id', projectId);
    }

    const result = await uploadDocument(formData);
    if (result) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="upload-dialog-title"
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Upload Knowledge Document
        </Typography>
        {!uploading && (
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers sx={{ p: 3 }}>
          {/* Drag & Drop File Box */}
          {!selectedFile ? (
            <Box
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              sx={{
                border: `2px dashed ${
                  isDragActive ? theme.palette.primary.main : theme.palette.divider
                }`,
                borderRadius: 4,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive
                  ? alpha(theme.palette.primary.main, 0.05)
                  : alpha(theme.palette.background.default, 0.5),
                transition: 'all 0.25s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
                mb: 3,
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept={ACCEPTED_EXTENSIONS.join(',')}
              />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Drag & drop your file here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                or click to browse local files
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                Supported formats: PDF, DOCX, TXT, MD, CSV, JSON (Max 50MB)
              </Typography>
              {errors.file && (
                <FormHelperText error sx={{ textAlign: 'center', mt: 1 }}>
                  {errors.file}
                </FormHelperText>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                borderRadius: 2.5,
                bgcolor: 'action.selected',
                mb: 3,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <InsertDriveFileIcon sx={{ fontSize: 36, color: 'primary.main', mr: 2 }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, noWrap: true }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
              {!uploading && (
                <Button
                  size="small"
                  color="error"
                  onClick={() => setSelectedFile(null)}
                  sx={{ minWidth: 0, px: 1.5 }}
                >
                  Change
                </Button>
              )}
            </Box>
          )}

          {/* Title and Metadata selections */}
          <TextField
            fullWidth
            label="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2.5 }}
          />

          <FormControl fullWidth sx={{ mb: 1.5 }}>
            <InputLabel id="project-select-label">Associated Project (Optional)</InputLabel>
            <Select
              labelId="project-select-label"
              value={projectId}
              label="Associated Project (Optional)"
              onChange={(e) => setProjectId(e.target.value)}
              disabled={uploading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {projects.map((proj) => (
                <MenuItem key={proj.id} value={proj.id}>
                  {proj.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Progress bar */}
          {uploading && (
            <Box sx={{ width: '100%', mt: 3, mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Uploading knowledge base document...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {uploadProgress}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={onClose} disabled={uploading} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={uploading}
            sx={{ borderRadius: 2 }}
          >
            Upload
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default UploadDialog;
