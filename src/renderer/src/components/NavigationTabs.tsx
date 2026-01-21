import React from 'react'
import { Tabs, Tab, Box } from '@mui/material'
import { History as HistoryIcon, Settings as SettingsIcon } from '@mui/icons-material'

interface NavigationTabsProps {
  value: string
  onChange: (value: string) => void
}

export function NavigationTabs({ value, onChange }: NavigationTabsProps) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Tabs
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab 
          value="history" 
          label="History" 
          icon={<HistoryIcon fontSize="small" />} 
          iconPosition="start"
          sx={{ minHeight: 48 }}
        />
        <Tab 
          value="settings" 
          label="Settings" 
          icon={<SettingsIcon fontSize="small" />} 
          iconPosition="start"
          sx={{ minHeight: 48 }}
        />
      </Tabs>
    </Box>
  )
}
