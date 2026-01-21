import React from 'react'
import {
  Box,
  TextField,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  FormControl
} from '@mui/material'
import {
  Search as SearchIcon,
  Sort as SortIcon,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material'
import { SortBy, SortOrder } from '../env.d'

interface HistoryControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortBy
  onSortByChange: (sortBy: SortBy) => void
  sortOrder: SortOrder
  onToggleSortOrder: () => void
}

export function HistoryControls({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder
}: HistoryControlsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <TextField
        size="small"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          )
        }}
      />
      
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          displayEmpty
        >
          <MenuItem value="timestamp">Date</MenuItem>
          <MenuItem value="size">Size</MenuItem>
          <MenuItem value="expiresAt">Expiry</MenuItem>
        </Select>
      </FormControl>

      <Tooltip title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}>
        <IconButton onClick={onToggleSortOrder} size="medium" sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
          {sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}
