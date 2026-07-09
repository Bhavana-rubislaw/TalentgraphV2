/**
 * Comprehensive Logging Dashboard Component
 * Provides real-time log monitoring, filtering, and analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tab,
  Tabs,
  Alert,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  module: string;
  function: string;
  line_number: number;
  request_id?: string;
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: string;
  exception?: string;
  created_at: string;
}

interface LogStats {
  total_logs: number;
  by_level: Record<string, number>;
  by_module: Record<string, number>;
  error_rate: number;
  recent_errors: number;
  last_24h: number;
}

interface LogFilters {
  startDate?: Date;
  endDate?: Date;
  level?: string;
  module?: string;
  userId?: number;
  requestId?: string;
  action?: string;
  entityType?: string;
  search?: string;
}

const LoggingDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [filters, setFilters] = useState<LogFilters>({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ offset: 0, limit: 100 });
  const [hasMore, setHasMore] = useState(false);
  
  const autoRefreshRef = useRef<NodeJS.Timeout>();

  // Fetch logs based on current filters
  const fetchLogs = async (append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) {
        params.set('start_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set('end_date', filters.endDate.toISOString());
      }
      if (filters.level) params.set('level', filters.level);
      if (filters.module) params.set('module', filters.module);
      if (filters.userId) params.set('user_id', filters.userId.toString());
      if (filters.requestId) params.set('request_id', filters.requestId);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entity_type', filters.entityType);
      if (filters.search) params.set('search', filters.search);
      
      params.set('limit', pagination.limit.toString());
      params.set('offset', append ? (pagination.offset + pagination.limit).toString() : '0');

      const response = await fetch(`/api/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      
      if (append) {
        setLogs(prev => [...prev, ...data.logs]);
        setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      } else {
        setLogs(data.logs);
        setPagination(prev => ({ ...prev, offset: 0 }));
      }
      
      setHasMore(data.has_more);
      
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch log statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/logs/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Export logs
  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('start_date', filters.startDate.toISOString());
      if (filters.endDate) params.set('end_date', filters.endDate.toISOString());
      if (filters.level) params.set('level', filters.level);

      const response = await fetch(`/api/logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export logs');
      
      const data = await response.json();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  // Cleanup old logs
  const cleanupLogs = async (days: number) => {
    try {
      const response = await fetch(`/api/logs/cleanup?days=${days}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to cleanup logs');
      
      const data = await response.json();
      alert(`Deleted ${data.deleted} old logs`);
      fetchLogs();
      fetchStats();
      
    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }
    
    setCleanupDialogOpen(false);
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 30000); // Refresh every 30 seconds
      
      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
        }
      };
    }
  }, [autoRefresh, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  // Get log level icon and color
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return <ErrorIcon color="error" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      case 'INFO':
        return <InfoIcon color="info" />;
      case 'DEBUG':
        return <DebugIcon color="action" />;
      default:
        return <InfoIcon />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'error';
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  // Render statistics cards
  const renderStats = () => {\n    if (!stats) return null;\n\n    return (\n      <Grid container spacing={2} sx={{ mb: 3 }}>\n        <Grid item xs={12} sm={6} md={2}>\n          <Card>\n            <CardContent>\n              <Typography variant=\"h6\">{stats.total_logs}</Typography>\n              <Typography variant=\"body2\" color=\"text.secondary\">Total Logs</Typography>\n            </CardContent>\n          </Card>\n        </Grid>\n        \n        <Grid item xs={12} sm={6} md={2}>\n          <Card>\n            <CardContent>\n              <Typography variant=\"h6\" color={stats.error_rate > 5 ? 'error' : 'inherit'}>\n                {stats.error_rate}%\n              </Typography>\n              <Typography variant=\"body2\" color=\"text.secondary\">Error Rate</Typography>\n            </CardContent>\n          </Card>\n        </Grid>\n        \n        <Grid item xs={12} sm={6} md={2}>\n          <Card>\n            <CardContent>\n              <Typography variant=\"h6\" color={stats.recent_errors > 10 ? 'error' : 'inherit'}>\n                {stats.recent_errors}\n              </Typography>\n              <Typography variant=\"body2\" color=\"text.secondary\">Recent Errors</Typography>\n            </CardContent>\n          </Card>\n        </Grid>\n        \n        <Grid item xs={12} sm={6} md={3}>\n          <Card>\n            <CardContent>\n              <Typography variant=\"body2\" color=\"text.secondary\" gutterBottom>By Level</Typography>\n              {Object.entries(stats.by_level).map(([level, count]) => (\n                <Chip\n                  key={level}\n                  label={`${level}: ${count}`}\n                  size=\"small\"\n                  color={getLevelColor(level) as any}\n                  sx={{ mr: 1, mb: 1 }}\n                />\n              ))}\n            </CardContent>\n          </Card>\n        </Grid>\n        \n        <Grid item xs={12} md={3}>\n          <Card>\n            <CardContent>\n              <Typography variant=\"body2\" color=\"text.secondary\" gutterBottom>Top Modules</Typography>\n              {Object.entries(stats.by_module)\n                .sort(([,a], [,b]) => b - a)\n                .slice(0, 5)\n                .map(([module, count]) => (\n                  <Typography key={module} variant=\"body2\">\n                    {module}: {count}\n                  </Typography>\n                ))}\n            </CardContent>\n          </Card>\n        </Grid>\n      </Grid>\n    );\n  };

  // Render filters panel
  const renderFilters = () => {\n    return (\n      <Accordion sx={{ mb: 2 }}>\n        <AccordionSummary expandIcon={<ExpandMoreIcon />}>\n          <FilterIcon sx={{ mr: 1 }} />\n          <Typography>Filters</Typography>\n        </AccordionSummary>\n        <AccordionDetails>\n          <Grid container spacing={2}>\n            <Grid item xs={12} sm={6} md={3}>\n              <LocalizationProvider dateAdapter={AdapterDateFns}>\n                <DateTimePicker\n                  label=\"Start Date\"\n                  value={filters.startDate || null}\n                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date || undefined }))}\n                  renderInput={(params) => <TextField {...params} fullWidth size=\"small\" />}\n                />\n              </LocalizationProvider>\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={3}>\n              <LocalizationProvider dateAdapter={AdapterDateFns}>\n                <DateTimePicker\n                  label=\"End Date\"\n                  value={filters.endDate || null}\n                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date || undefined }))}\n                  renderInput={(params) => <TextField {...params} fullWidth size=\"small\" />}\n                />\n              </LocalizationProvider>\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={2}>\n              <FormControl fullWidth size=\"small\">\n                <InputLabel>Level</InputLabel>\n                <Select\n                  value={filters.level || ''}\n                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value || undefined }))}\n                >\n                  <MenuItem value=\"\">All</MenuItem>\n                  <MenuItem value=\"DEBUG\">DEBUG</MenuItem>\n                  <MenuItem value=\"INFO\">INFO</MenuItem>\n                  <MenuItem value=\"WARNING\">WARNING</MenuItem>\n                  <MenuItem value=\"ERROR\">ERROR</MenuItem>\n                  <MenuItem value=\"CRITICAL\">CRITICAL</MenuItem>\n                </Select>\n              </FormControl>\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={2}>\n              <TextField\n                label=\"Module\"\n                value={filters.module || ''}\n                onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value || undefined }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={2}>\n              <TextField\n                label=\"User ID\"\n                type=\"number\"\n                value={filters.userId || ''}\n                onChange={(e) => setFilters(prev => ({ \n                  ...prev, \n                  userId: e.target.value ? parseInt(e.target.value) : undefined \n                }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={3}>\n              <TextField\n                label=\"Request ID\"\n                value={filters.requestId || ''}\n                onChange={(e) => setFilters(prev => ({ ...prev, requestId: e.target.value || undefined }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={3}>\n              <TextField\n                label=\"Action\"\n                value={filters.action || ''}\n                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value || undefined }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={3}>\n              <TextField\n                label=\"Entity Type\"\n                value={filters.entityType || ''}\n                onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value || undefined }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n            \n            <Grid item xs={12} sm={6} md={3}>\n              <TextField\n                label=\"Search Message\"\n                value={filters.search || ''}\n                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}\n                fullWidth\n                size=\"small\"\n              />\n            </Grid>\n          </Grid>\n          \n          <Box sx={{ mt: 2 }}>\n            <Button\n              variant=\"contained\"\n              onClick={() => fetchLogs()}\n              disabled={loading}\n              sx={{ mr: 1 }}\n            >\n              Apply Filters\n            </Button>\n            <Button\n              variant=\"outlined\"\n              onClick={() => {\n                setFilters({});\n                setTimeout(() => fetchLogs(), 100);\n              }}\n            >\n              Clear Filters\n            </Button>\n          </Box>\n        </AccordionDetails>\n      </Accordion>\n    );\n  };

  // Render logs table
  const renderLogsTable = () => {\n    return (\n      <TableContainer component={Paper}>\n        <Table size=\"small\">\n          <TableHead>\n            <TableRow>\n              <TableCell>Time</TableCell>\n              <TableCell>Level</TableCell>\n              <TableCell>Module</TableCell>\n              <TableCell>Message</TableCell>\n              <TableCell>User</TableCell>\n              <TableCell>Action</TableCell>\n              <TableCell>Actions</TableCell>\n            </TableRow>\n          </TableHead>\n          <TableBody>\n            {logs.map((log) => (\n              <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>\n                <TableCell>\n                  {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}\n                </TableCell>\n                <TableCell>\n                  <Box sx={{ display: 'flex', alignItems: 'center' }}>\n                    {getLevelIcon(log.level)}\n                    <Typography variant=\"body2\" sx={{ ml: 1 }}>\n                      {log.level}\n                    </Typography>\n                  </Box>\n                </TableCell>\n                <TableCell>\n                  <Typography variant=\"body2\" sx={{ fontFamily: 'monospace' }}>\n                    {log.module}\n                  </Typography>\n                </TableCell>\n                <TableCell>\n                  <Typography \n                    variant=\"body2\" \n                    sx={{ \n                      maxWidth: 400, \n                      overflow: 'hidden', \n                      textOverflow: 'ellipsis',\n                      whiteSpace: 'nowrap'\n                    }}\n                  >\n                    {log.message}\n                  </Typography>\n                </TableCell>\n                <TableCell>\n                  {log.user_id ? (\n                    <Chip label={log.user_id} size=\"small\" variant=\"outlined\" />\n                  ) : (\n                    '-'\n                  )}\n                </TableCell>\n                <TableCell>\n                  {log.action ? (\n                    <Chip \n                      label={`${log.action}${log.entity_type ? ` (${log.entity_type})` : ''}`} \n                      size=\"small\" \n                      color=\"primary\" \n                      variant=\"outlined\" \n                    />\n                  ) : (\n                    '-'\n                  )}\n                </TableCell>\n                <TableCell>\n                  <IconButton\n                    size=\"small\"\n                    onClick={() => {\n                      setSelectedLog(log);\n                      setDetailsOpen(true);\n                    }}\n                  >\n                    <ViewIcon />\n                  </IconButton>\n                </TableCell>\n              </TableRow>\n            ))}\n          </TableBody>\n        </Table>\n        \n        {hasMore && (\n          <Box sx={{ p: 2, textAlign: 'center' }}>\n            <Button \n              variant=\"outlined\" \n              onClick={() => fetchLogs(true)}\n              disabled={loading}\n            >\n              Load More\n            </Button>\n          </Box>\n        )}\n      </TableContainer>\n    );\n  };

  // Render log details dialog
  const renderLogDetails = () => {\n    if (!selectedLog) return null;\n\n    return (\n      <Dialog \n        open={detailsOpen} \n        onClose={() => setDetailsOpen(false)}\n        maxWidth=\"md\"\n        fullWidth\n      >\n        <DialogTitle>\n          Log Details - {selectedLog.level}\n        </DialogTitle>\n        <DialogContent>\n          <Grid container spacing={2}>\n            <Grid item xs={6}>\n              <Typography variant=\"body2\" color=\"text.secondary\">Timestamp</Typography>\n              <Typography variant=\"body1\">{format(new Date(selectedLog.timestamp), 'PPpp')}</Typography>\n            </Grid>\n            <Grid item xs={6}>\n              <Typography variant=\"body2\" color=\"text.secondary\">Level</Typography>\n              <Chip label={selectedLog.level} color={getLevelColor(selectedLog.level) as any} />\n            </Grid>\n            <Grid item xs={12}>\n              <Typography variant=\"body2\" color=\"text.secondary\">Message</Typography>\n              <Typography variant=\"body1\">{selectedLog.message}</Typography>\n            </Grid>\n            <Grid item xs={6}>\n              <Typography variant=\"body2\" color=\"text.secondary\">Module</Typography>\n              <Typography variant=\"body1\" sx={{ fontFamily: 'monospace' }}>\n                {selectedLog.module}\n              </Typography>\n            </Grid>\n            <Grid item xs={6}>\n              <Typography variant=\"body2\" color=\"text.secondary\">Function</Typography>\n              <Typography variant=\"body1\" sx={{ fontFamily: 'monospace' }}>\n                {selectedLog.function || 'N/A'}\n              </Typography>\n            </Grid>\n            {selectedLog.request_id && (\n              <Grid item xs={12}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Request ID</Typography>\n                <Typography variant=\"body1\" sx={{ fontFamily: 'monospace' }}>\n                  {selectedLog.request_id}\n                </Typography>\n              </Grid>\n            )}\n            {selectedLog.action && (\n              <Grid item xs={6}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Action</Typography>\n                <Typography variant=\"body1\">{selectedLog.action}</Typography>\n              </Grid>\n            )}\n            {selectedLog.entity_type && (\n              <Grid item xs={6}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Entity Type</Typography>\n                <Typography variant=\"body1\">{selectedLog.entity_type}</Typography>\n              </Grid>\n            )}\n            {selectedLog.entity_id && (\n              <Grid item xs={12}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Entity ID</Typography>\n                <Typography variant=\"body1\">{selectedLog.entity_id}</Typography>\n              </Grid>\n            )}\n            {selectedLog.metadata && (\n              <Grid item xs={12}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Metadata</Typography>\n                <Box sx={{ \n                  backgroundColor: 'grey.100', \n                  p: 1, \n                  borderRadius: 1, \n                  fontFamily: 'monospace',\n                  fontSize: '0.875rem',\n                  mt: 1,\n                  overflowX: 'auto'\n                }}>\n                  <pre>{selectedLog.metadata}</pre>\n                </Box>\n              </Grid>\n            )}\n            {selectedLog.exception && (\n              <Grid item xs={12}>\n                <Typography variant=\"body2\" color=\"text.secondary\">Exception</Typography>\n                <Box sx={{ \n                  backgroundColor: 'error.light', \n                  color: 'error.contrastText',\n                  p: 1, \n                  borderRadius: 1, \n                  fontFamily: 'monospace',\n                  fontSize: '0.875rem',\n                  mt: 1,\n                  overflowX: 'auto'\n                }}>\n                  <pre>{selectedLog.exception}</pre>\n                </Box>\n              </Grid>\n            )}\n          </Grid>\n        </DialogContent>\n        <DialogActions>\n          <Button onClick={() => setDetailsOpen(false)}>Close</Button>\n        </DialogActions>\n      </Dialog>\n    );\n  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant=\"h4\" component=\"h1\">\n          System Logs Dashboard\n        </Typography>\n        \n        <Box sx={{ display: 'flex', gap: 1 }}>\n          <FormControlLabel\n            control={\n              <Switch \n                checked={autoRefresh} \n                onChange={(e) => setAutoRefresh(e.target.checked)}\n              />\n            }\n            label=\"Auto Refresh\"\n          />\n          \n          <Tooltip title=\"Refresh\">\n            <IconButton onClick={() => { fetchLogs(); fetchStats(); }} disabled={loading}>\n              <RefreshIcon />\n            </IconButton>\n          </Tooltip>\n          \n          <Tooltip title=\"Export Logs\">\n            <IconButton onClick={exportLogs}>\n              <DownloadIcon />\n            </IconButton>\n          </Tooltip>\n          \n          <Tooltip title=\"Cleanup Old Logs\">\n            <IconButton onClick={() => setCleanupDialogOpen(true)}>\n              <DeleteIcon />\n            </IconButton>\n          </Tooltip>\n        </Box>\n      </Box>\n      \n      {loading && <LinearProgress sx={{ mb: 2 }} />}\n      \n      {renderStats()}\n      {renderFilters()}\n      \n      <Card>\n        <CardContent>\n          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 2 }}>\n            <Tab label={`Logs (${logs.length})`} />\n            <Tab label=\"Real-time\" disabled />\n          </Tabs>\n          \n          {selectedTab === 0 && renderLogsTable()}\n        </CardContent>\n      </Card>\n      \n      {renderLogDetails()}\n      \n      {/* Cleanup Dialog */}\n      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)}>\n        <DialogTitle>Cleanup Old Logs</DialogTitle>\n        <DialogContent>\n          <Alert severity=\"warning\" sx={{ mb: 2 }}>\n            This will permanently delete logs older than the specified number of days.\n          </Alert>\n          <Typography>How many days of logs do you want to keep?</Typography>\n        </DialogContent>\n        <DialogActions>\n          <Button onClick={() => setCleanupDialogOpen(false)}>Cancel</Button>\n          <Button onClick={() => cleanupLogs(30)} color=\"warning\">\n            Keep 30 Days\n          </Button>\n          <Button onClick={() => cleanupLogs(7)} color=\"error\">\n            Keep 7 Days\n          </Button>\n        </DialogActions>\n      </Dialog>\n    </Box>\n  );\n};\n\nexport default LoggingDashboard;