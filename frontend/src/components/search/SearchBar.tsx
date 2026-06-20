import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Collapse,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  IconButton,
  alpha,
  useTheme,
  Stack,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import SearchIcon from '@mui/icons-material/Search';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import { useSearch } from '../../hooks/useSearch';
import { SEARCH_TYPES, TIME_RANGES, ACCEPTED_EXTENSIONS } from '../../utils/constants';
import type { Project } from '../../types';
import apiClient from '../../api/client';

interface SearchBarProps {
  onSearch: (
    query: string,
    options: {
      searchType: 'semantic' | 'hybrid' | 'keyword';
      fileTypes: string[];
      dateRange: string;
      projectId: string;
      departmentId: string;
    }
  ) => void;
  initialQuery?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, initialQuery = '' }) => {
  const theme = useTheme();
  const { suggestions, debouncedSuggestions } = useSearch();

  // Search Input State
  const [inputValue, setInputValue] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'semantic' | 'hybrid' | 'keyword'>('hybrid');

  // Collapsible Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState('all');

  // Hardcoded fallback lists
  const mockDepartments = [
    { id: 'dept-eng', name: 'Engineering' },
    { id: 'dept-prod', name: 'Product Management' },
    { id: 'dept-data', name: 'Data Science' },
    { id: 'dept-fin', name: 'Finance' },
    { id: 'dept-hr', name: 'Human Resources' },
  ];

  const mockProjects: Project[] = [
    {
      id: 'proj-rag',
      name: 'RAG Integration Engine',
      description: '',
      status: 'active',
      department_id: 'dept-eng',
      members: [],
      created_at: '',
    },
    {
      id: 'proj-ekh',
      name: 'Enterprise Knowledge Hub',
      description: '',
      status: 'active',
      department_id: 'dept-prod',
      members: [],
      created_at: '',
    },
  ];

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await apiClient.get<Project[]>('/projects');
        if (response.data && Array.isArray(response.data)) {
          setProjects(response.data);
        } else {
          setProjects(mockProjects);
        }
      } catch {
        setProjects(mockProjects);
      }
    };
    loadProjects();
  }, []);

  // Update suggestions when input changes
  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    debouncedSuggestions(newInputValue);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch(inputValue, {
      searchType,
      fileTypes: selectedFileTypes,
      dateRange: selectedDateRange,
      projectId: selectedProject,
      departmentId: selectedDepartment,
    });
  };

  const handleResetFilters = () => {
    setSelectedProject('');
    setSelectedDepartment('');
    setSelectedFileTypes([]);
    setSelectedDateRange('all');
    setSearchType('hybrid');
  };

  const fileTypeOptions = ACCEPTED_EXTENSIONS.map((ext) => ext.replace('.', ''));

  return (
    <Box
      sx={{
        width: '100%',
        p: 2.5,
        borderRadius: 4,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === 'dark'
            ? alpha('#111128', 0.4)
            : '#ffffff',
        backdropFilter: 'blur(20px)',
        boxShadow: theme.shadows[2],
      }}
    >
      <form onSubmit={handleSearchSubmit}>
        {/* Main Search Row */}
        <Grid container spacing={2} alignItems="center">
          {/* Autocomplete Input */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              freeSolo
              options={suggestions}
              value={inputValue}
              onInputChange={handleInputChange}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setInputValue(newValue);
                  onSearch(newValue, {
                    searchType,
                    fileTypes: selectedFileTypes,
                    dateRange: selectedDateRange,
                    projectId: selectedProject,
                    departmentId: selectedDepartment,
                  });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  placeholder="Ask a question or enter keywords..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <SearchIcon sx={{ color: 'text.secondary', ml: 1, mr: 0.5 }} />
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Search Type Toggle */}
          <Grid item xs={12} sm={8} md={4}>
            <ToggleButtonGroup
              value={searchType}
              exclusive
              onChange={(e, value) => {
                if (value) {
                  setSearchType(value);
                }
              }}
              fullWidth
              sx={{ height: 48 }}
            >
              {SEARCH_TYPES.map((t) => (
                <ToggleButton key={t.value} value={t.value} sx={{ py: 0 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                      {t.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', lg: 'block' } }}>
                      {t.description}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          {/* Filter & Action Buttons */}
          <Grid item xs={12} sm={4} md={2}>
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                onClick={() => setShowFilters(!showFilters)}
                fullWidth
                sx={{ height: 48, borderRadius: 2 }}
                startIcon={showFilters ? <FilterListOffIcon /> : <FilterListIcon />}
              >
                Filters
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ height: 48, borderRadius: 2 }}
              >
                Search
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* Collapsible Advanced Filters */}
        <Collapse in={showFilters} sx={{ mt: 3 }}>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2.5}>
            {/* Project Select */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="search-project-label">Project</InputLabel>
                <Select
                  labelId="search-project-label"
                  value={selectedProject}
                  label="Project"
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Projects</em>
                  </MenuItem>
                  {projects.map((proj) => (
                    <MenuItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Department Select */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="search-dept-label">Department</InputLabel>
                <Select
                  labelId="search-dept-label"
                  value={selectedDepartment}
                  label="Department"
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Departments</em>
                  </MenuItem>
                  {mockDepartments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* File Types Multi-select */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="search-filetypes-label">File Formats</InputLabel>
                <Select
                  labelId="search-filetypes-label"
                  multiple
                  value={selectedFileTypes}
                  input={<OutlinedInput label="File Formats" />}
                  renderValue={(selected) => selected.map((s) => s.toUpperCase()).join(', ')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedFileTypes(typeof value === 'string' ? value.split(',') : value);
                  }}
                >
                  {fileTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Checkbox checked={selectedFileTypes.indexOf(type) > -1} />
                      <ListItemText primary={type.toUpperCase()} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range Select */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="search-date-label">Time Period</InputLabel>
                <Select
                  labelId="search-date-label"
                  value={selectedDateRange}
                  label="Time Period"
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                >
                  <MenuItem value="all">
                    <em>Any Time</em>
                  </MenuItem>
                  {TIME_RANGES.map((range) => (
                    <MenuItem key={range.value} value={range.value}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Reset Filters Option */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              size="small"
              startIcon={<RotateLeftIcon />}
              onClick={handleResetFilters}
              sx={{ color: 'text.secondary' }}
            >
              Reset Filters
            </Button>
          </Box>
        </Collapse>
      </form>
    </Box>
  );
};

export default SearchBar;
