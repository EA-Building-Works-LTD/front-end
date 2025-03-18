// Dashboard.js

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import "./Dashboard.css";
import { getLeadsForDashboard } from "../firebase/leads";
import { auth } from "../firebase/config";
import { formatCurrency } from "../utils/formatters";
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import BarChartIcon from '@mui/icons-material/BarChart';

// Helper function to calculate commission
const calculateCommission = (profit) => {
  return profit * 0.1; // 10% commission
};

// Helper function to format date to UK format (DD/MM/YYYY)
const formatUKDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const dateObj = timestamp instanceof Date ? timestamp : 
    typeof timestamp === 'object' && timestamp.seconds ? 
      new Date(timestamp.seconds * 1000) :
      new Date(timestamp);
  
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
};

const COLORS = ['#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#264653', '#8ECAE6', '#219EBC', '#023047'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [viewType, setViewType] = useState('table'); // 'table', 'pie', 'bar'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'month', 'year'
  
  // Fetch all leads with contract values as admin
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        if (!auth.currentUser) {
          setError("You must be logged in to view the dashboard");
          setLoading(false);
          return;
        }
        
        // Use the optimized function that only returns leads with contract values
        const fetchedLeads = await getLeadsForDashboard(auth.currentUser.uid, true);
        setLeads(fetchedLeads);
      } catch (err) {
        console.error("Error fetching leads:", err);
        setError("Failed to fetch leads. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, []);

  // Filter leads based on time
  const filteredLeads = useMemo(() => {
    if (timeFilter === 'all') return leads;
    
    const now = new Date();
    let cutoffDate;
    
    if (timeFilter === 'month') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (timeFilter === 'year') {
      cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }
    
    return leads.filter(lead => {
      const leadDate = lead.timestamp instanceof Date ? lead.timestamp : 
        typeof lead.timestamp === 'object' && lead.timestamp.seconds ? 
          new Date(lead.timestamp.seconds * 1000) :
          new Date(lead.timestamp);
      
      return leadDate >= cutoffDate;
    });
  }, [leads, timeFilter]);
  
  // Calculate builder stats from leads
  const builderStats = useMemo(() => {
    const stats = {};
    
    filteredLeads.forEach(lead => {
      const builderName = lead.builder || 'Unknown';
      
      if (!stats[builderName]) {
        stats[builderName] = {
          name: builderName,
          contractTotal: 0,
          profitTotal: 0,
          commissionTotal: 0,
          leadCount: 0,
          completedLeads: 0,
          pendingLeads: 0,
          leads: []
        };
      }
      
      // Extract numeric values from leads
      const contractAmount = lead.contractAmount ? 
        parseFloat(lead.contractAmount.replace(/[^0-9.-]+/g, "")) : 0;
      
      const profit = lead.profit ? 
        parseFloat(lead.profit.replace(/[^0-9.-]+/g, "")) : 0;
      
      // Calculate commission (10% of profit)
      const commission = calculateCommission(profit);
      
      // Update builder stats
      stats[builderName].contractTotal += contractAmount;
      stats[builderName].profitTotal += profit;
      stats[builderName].commissionTotal += commission;
      stats[builderName].leadCount++;
      
      // Count completed and pending leads
      if (lead.stage === 'Completed') {
        stats[builderName].completedLeads++;
      } else if (lead.stage !== 'Cancelled' && lead.stage !== 'Rejected') {
        stats[builderName].pendingLeads++;
      }
      
      // Store the lead
      stats[builderName].leads.push(lead);
    });
    
    // Convert to array and sort by commission (highest first)
    return Object.values(stats).sort((a, b) => b.commissionTotal - a.commissionTotal);
  }, [filteredLeads]);
  
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return builderStats.reduce((acc, builder) => {
      acc.totalContract += builder.contractTotal;
      acc.totalProfit += builder.profitTotal;
      acc.totalCommission += builder.commissionTotal;
      acc.totalLeads += builder.leadCount;
      return acc;
    }, { 
      totalContract: 0, 
      totalProfit: 0, 
      totalCommission: 0, 
      totalLeads: 0 
    });
  }, [builderStats]);
  
  // Prepare chart data
  const chartData = useMemo(() => ({
    pie: builderStats.map(builder => ({
      name: builder.name,
      value: builder.commissionTotal
    })),
    bar: builderStats.map(builder => ({
      name: builder.name,
      contract: builder.contractTotal,
      profit: builder.profitTotal,
      commission: builder.commissionTotal
    }))
  }), [builderStats]);
  
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Use the optimized function for refreshing data
      const fetchedLeads = await getLeadsForDashboard(auth.currentUser.uid, true);
      setLeads(fetchedLeads);
    } catch (err) {
      setError("Failed to refresh data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleViewTypeChange = (type) => {
    setViewType(type);
  };
  
  const handleTimeFilterChange = (event) => {
    setTimeFilter(event.target.value);
  };
  
  if (loading) {
    return (
      <Box className="dashboard-container" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box className="dashboard-container" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', minHeight: '80vh' }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Box>
    );
  }
  
  return (
    <Box className="dashboard-container">
      <Box className="dashboard-header">
      <Typography variant="h4" className="dashboard-title">
          Earnings Dashboard
      </Typography>
        <Box className="dashboard-actions">
          <FormControl size="small" sx={{ width: 140, mr: 1 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={timeFilter}
              label="Time Period"
              onChange={handleTimeFilterChange}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} className="action-button">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Table View">
            <IconButton 
              onClick={() => handleViewTypeChange('table')} 
              className={`action-button ${viewType === 'table' ? 'active' : ''}`}>
              <ViewListIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Pie Chart">
            <IconButton 
              onClick={() => handleViewTypeChange('pie')} 
              className={`action-button ${viewType === 'pie' ? 'active' : ''}`}>
              <DonutLargeIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Bar Chart">
            <IconButton 
              onClick={() => handleViewTypeChange('bar')} 
              className={`action-button ${viewType === 'bar' ? 'active' : ''}`}>
              <BarChartIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={2} className="summary-cards">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Contract Value
              </Typography>
              <Typography variant="h4" className="summary-value">
                {formatCurrency(summaryStats.totalContract)}
            </Typography>
              <Typography variant="caption" color="textSecondary">
                {summaryStats.totalLeads} Leads
            </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Profit
              </Typography>
              <Typography variant="h4" className="summary-value">
                {formatCurrency(summaryStats.totalProfit)}
            </Typography>
              <Typography variant="caption" color="textSecondary">
                {Math.round((summaryStats.totalProfit / summaryStats.totalContract) * 100) || 0}% Profit Margin
            </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Commission
              </Typography>
              <Typography variant="h4" className="summary-value commission-value">
                {formatCurrency(summaryStats.totalCommission)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                10% of Total Profit
              </Typography>
            </CardContent>
          </Card>
      </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="summary-card">
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Active Builders
              </Typography>
              <Typography variant="h4" className="summary-value">
                {builderStats.length}
                </Typography>
              <Typography variant="caption" color="textSecondary">
                With Recorded Leads
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Main Content Area */}
      <Card className="main-content-card">
        <CardContent>
          {viewType === 'table' && (
            <TableContainer component={Paper} className="builders-table">
              <Table stickyHeader>
                  <TableHead>
                  <TableRow>
                    <TableCell className="table-header">Builder</TableCell>
                    <TableCell className="table-header" align="right">Contract Value</TableCell>
                    <TableCell className="table-header" align="right">Profit</TableCell>
                    <TableCell className="table-header" align="right">Commission (10%)</TableCell>
                    <TableCell className="table-header" align="center">Leads</TableCell>
                    <TableCell className="table-header" align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {builderStats.map((builder) => (
                    <TableRow key={builder.name} className="builder-row">
                      <TableCell component="th" scope="row" className="builder-name-cell">
                        {builder.name}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(builder.contractTotal)}</TableCell>
                      <TableCell align="right">{formatCurrency(builder.profitTotal)}</TableCell>
                      <TableCell align="right" className="commission-cell">
                        {formatCurrency(builder.commissionTotal)}
                      </TableCell>
                      <TableCell align="center">
                        <Box className="leads-count">
                          <Chip 
                            label={`${builder.leadCount} Total`} 
                            className="total-leads-chip"
                            size="small"
                          />
                          <Box className="leads-breakdown">
                            <Chip 
                              label={`${builder.completedLeads} Completed`} 
                              className="completed-leads-chip"
                              size="small"
                            />
                            <Chip 
                              label={`${builder.pendingLeads} Pending`} 
                              className="pending-leads-chip"
                              size="small"
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={builder.commissionTotal > 0 ? "Paid" : "Pending"} 
                          color={builder.commissionTotal > 0 ? "success" : "warning"}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {viewType === 'pie' && (
            <Box className="chart-container">
              <Typography variant="h6" align="center" gutterBottom>
                Commission Distribution by Builder
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData.pie}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.pie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
          
          {viewType === 'bar' && (
            <Box className="chart-container">
              <Typography variant="h6" align="center" gutterBottom>
                Builder Performance Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData.bar}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70} 
                    interval={0}
                  />
                  <YAxis tickFormatter={(value) => `£${value.toLocaleString()}`} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="contract" name="Contract Value" fill="#264653" />
                  <Bar dataKey="profit" name="Profit" fill="#2A9D8F" />
                  <Bar dataKey="commission" name="Commission" fill="#E9C46A" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Builder Details Section */}
      <Card className="builder-details-card">
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="builder-tabs"
          >
            {builderStats.map((builder, index) => (
              <Tab 
                label={builder.name} 
                key={builder.name} 
                className={tabValue === index ? 'active-tab' : ''}
              />
            ))}
          </Tabs>
          
          {builderStats.length > 0 && builderStats.map((builder, index) => (
            <Box 
              key={builder.name}
              className="builder-detail-content"
              style={{ display: tabValue === index ? 'block' : 'none' }}
            >
              <Grid container spacing={2} className="builder-summary-cards">
                <Grid item xs={12} sm={6} md={3}>
                  <Card className="builder-summary-card">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">
                        Contract Value
                      </Typography>
                      <Typography variant="h5" className="summary-value">
                        {formatCurrency(builder.contractTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card className="builder-summary-card">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">
                        Profit
                      </Typography>
                      <Typography variant="h5" className="summary-value">
                        {formatCurrency(builder.profitTotal)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {Math.round((builder.profitTotal / builder.contractTotal) * 100) || 0}% Profit Margin
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card className="builder-summary-card">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">
                        Commission Owed
                      </Typography>
                      <Typography variant="h5" className="summary-value commission-value">
                        {formatCurrency(builder.commissionTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card className="builder-summary-card">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">
                        Lead Count
                      </Typography>
                      <Typography variant="h5" className="summary-value">
                        {builder.leadCount}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {builder.completedLeads} Completed, {builder.pendingLeads} Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="h6" className="section-title">
                Lead Details
              </Typography>
              
              <TableContainer component={Paper} className="leads-table">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-header">Customer</TableCell>
                      <TableCell className="table-header">Date</TableCell>
                      <TableCell className="table-header">Stage</TableCell>
                      <TableCell className="table-header" align="right">Contract Amount</TableCell>
                      <TableCell className="table-header" align="right">Profit</TableCell>
                      <TableCell className="table-header" align="right">Commission</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {builder.leads.map((lead) => {
                      const contractAmount = lead.contractAmount ? 
                        parseFloat(lead.contractAmount.replace(/[^0-9.-]+/g, "")) : 0;
                      
                      const profit = lead.profit ? 
                        parseFloat(lead.profit.replace(/[^0-9.-]+/g, "")) : 0;
                      
                      const commission = calculateCommission(profit);
                      
                      return (
                        <TableRow key={lead._id} className="lead-row">
                          <TableCell>
                            <Typography variant="body2" className="customer-name">
                              {lead.fullName || lead.customerName || "Unknown"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {lead.address || "No address"}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatUKDate(lead.timestamp)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={lead.stage || "New Lead"} 
                              className={`stage-chip stage-${(lead.stage || "New Lead").toLowerCase().replace(/\s+/g, '-')}`}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(contractAmount)}</TableCell>
                          <TableCell align="right">{formatCurrency(profit)}</TableCell>
                          <TableCell align="right" className="commission-cell">{formatCurrency(commission)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
                    </Box>
                  ))}
          
          {builderStats.length === 0 && (
            <Box className="no-data-message">
              <Typography variant="h6">No builder data available</Typography>
              <Typography variant="body2">
                There are no leads with contract values or profits recorded.
                </Typography>
              </Box>
          )}
            </CardContent>
          </Card>
    </Box>
  );
}

