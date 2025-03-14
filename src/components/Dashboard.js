// Dashboard.js

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Paper,
} from "@mui/material";
// import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import "./Dashboard.css";
import { useUserRole } from "./Auth/UserRoleContext";

// Utility for formatting the date to DD/MM/YYYY
function formatUKDate(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  // --- State Declarations ---
  const userRole = useUserRole();
  const [builders, setBuilders] = useState([
    { id: 1, name: "N.Hussain", image: "https://via.placeholder.com/40" },
    { id: 2, name: "Z.Khan", image: "https://via.placeholder.com/40" },
    { id: 3, name: "H.Ali", image: "https://via.placeholder.com/40" },
    { id: 4, name: "M.Ahmed", image: "https://via.placeholder.com/40" },
    { id: 5, name: "F.Khan", image: "https://via.placeholder.com/40" },
  ]);

  const [invoiceNumber, setInvoiceNumber] = useState(10001);
  const [invoices, setInvoices] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableAction, setTableAction] = useState("");
  const [selectedBuilderId, setSelectedBuilderId] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState("100");
  const [openDialog, setOpenDialog] = useState(false);
  const [newBuilderName, setNewBuilderName] = useState("");
  
  // For horizontal scroller
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // --- Effects ---
  // Load invoices from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("invoices");
    if (saved) {
      setInvoices(JSON.parse(saved));
    }
  }, []);

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("invoices", JSON.stringify(invoices));
  }, [invoices]);

  // --- Derived Values using useMemo ---
  const doneBalance = useMemo(
    () =>
      invoices.reduce((acc, inv) => (inv.status === "Done" ? acc + Number(inv.amount) : acc), 0),
    [invoices]
  );

  const pendingBalance = useMemo(
    () =>
      invoices.reduce((acc, inv) => (inv.status === "Pending" ? acc + Number(inv.amount) : acc), 0),
    [invoices]
  );

  const builderPayments = useMemo(() => {
    return builders.map((builder) => {
      const totalPaid = invoices
        .filter((inv) => inv.builderName === builder.name && inv.status === "Done")
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
      return { ...builder, totalPaid };
    });
  }, [builders, invoices]);

  const topBuilders = useMemo(() => {
    return [...builderPayments].sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5);
  }, [builderPayments]);

  const disableRequest = useMemo(() => {
    return !selectedBuilderId || !invoiceAmount || Number(invoiceAmount) < 1;
  }, [selectedBuilderId, invoiceAmount]);

  // --- Event Handlers using useCallback ---

  // Builder scroller events
  const handleMouseDown = useCallback((e) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseLeave = useCallback(() => setIsDown(false), []);
  const handleMouseUp = useCallback(() => setIsDown(false), []);
  const handleMouseMove = useCallback((e) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  }, [isDown, scrollLeft, startX]);

  // Row checkbox handler
  const handleRowCheckbox = useCallback((invId, checked) => {
    setSelectedRows((prev) =>
      checked ? [...prev, invId] : prev.filter((id) => id !== invId)
    );
  }, []);

  // Table action handler
  const handleTableActionChange = useCallback((e) => {
    const action = e.target.value;
    setTableAction(action);

    if (selectedRows.length < 1) return;

    if (action === "Pending" || action === "Done") {
      setInvoices((prev) =>
        prev.map((inv) =>
          selectedRows.includes(inv.id) ? { ...inv, status: action } : inv
        )
      );
    } else if (action === "Delete") {
      setInvoices((prev) =>
        prev.filter((inv) => !selectedRows.includes(inv.id))
      );
    }
    // Clear selection and reset
    setSelectedRows([]);
    setTableAction("");
  }, [selectedRows]);

  // Handler to select a builder for invoice
  const handleSelectBuilder = useCallback((builderId) => {
    setSelectedBuilderId(builderId);
  }, []);

  // "Add New" Builder Dialog handlers
  const handleAddNewClick = useCallback(() => setOpenDialog(true), []);
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setNewBuilderName("");
  }, []);
  const handleAddBuilder = useCallback(() => {
    if (!newBuilderName.trim()) return;
    const newId = builders.length + 1;
    setBuilders((prev) => [
      ...prev,
      { id: newId, name: newBuilderName, image: "https://via.placeholder.com/40" },
    ]);
    handleCloseDialog();
  }, [newBuilderName, builders.length, handleCloseDialog]);

  // Invoice request & PDF generation
  const handleRequestClick = useCallback(() => {
    if (disableRequest) return;

    const builder = builders.find((b) => b.id === selectedBuilderId);
    if (!builder) return;

    const issueDateObj = new Date();
    const invoiceDateIssued = formatUKDate(issueDateObj);
    const fileDate = invoiceDateIssued.replace(/\//g, "-"); // "DD-MM-YYYY"
    const currentInvoiceNo = invoiceNumber;
    const dueDateObj = new Date(issueDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
    const invoiceDueDate = formatUKDate(dueDateObj);

    const doc = new jsPDF("portrait", "pt", "A4");
    doc.addImage("/EABuildingWorksLTD.png", "PNG", 40, 40, 130, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(125, 155, 118);
    doc.text("INVOICE", 400, 80);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("EA Building Works LTD", 400, 110);
    doc.text("78 Clements Road", 400, 125);
    doc.text("Birmingham", 400, 140);
    doc.text("B25 8TT", 400, 155);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(builder.name, 40, 160);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Issued: ${invoiceDateIssued}`, 40, 175);
    doc.text(`Invoice No: ${currentInvoiceNo}`, 40, 190);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DESCRIPTION", 40, 220);
    doc.text("SUBTOTAL", 400, 220);
    doc.line(40, 230, 550, 230);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Commission", 40, 250);
    doc.text(`£${Number(invoiceAmount).toFixed(2)}`, 400, 250);
    doc.line(40, 265, 550, 265);

    doc.setFont("helvetica", "bold");
    doc.text("Amount Due", 280, 290);
    doc.text(`£${Number(invoiceAmount).toFixed(2)}`, 400, 290);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setFillColor(245, 245, 245);
    doc.rect(40, 480, 520, 100, "F");
    doc.setFont("helvetica", "bold");
    doc.text("BANK INFO", 60, 500);
    doc.setFont("helvetica", "normal");
    doc.text("Revolut Bank", 60, 520);
    doc.text("Account No: 90070860", 60, 535);
    doc.text("Sort Code: 04-29-09", 60, 550);
    doc.text(`Reference: ${invoiceDateIssued}`, 60, 565);

    doc.setFont("helvetica", "bold");
    doc.text("DUE BY", 450, 500);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceDueDate, 450, 520);

    doc.line(40, 800, 550, 800);
    doc.setFontSize(9);
    doc.text("07359739224", 60, 825);
    doc.text("eabuildingworksltd@gmail.com", 380, 825);

    const fileName = `${builder.name} - ${fileDate}.pdf`;
    doc.save(fileName);

    setInvoiceNumber((prev) => prev + 1);
    const uniqueSuffix = Math.random().toString(36).slice(2, 10);
    const uniqueId = `inv-${currentInvoiceNo}-${uniqueSuffix}`;
    const newInvoice = {
      id: uniqueId,
      builderName: builder.name,
      date: invoiceDateIssued,
      status: "Pending",
      amount: Number(invoiceAmount).toFixed(2),
    };
    // Add the new invoice to the front of the list
    setInvoices((prev) => [newInvoice, ...prev]);
  }, [disableRequest, builders, selectedBuilderId, invoiceNumber, invoiceAmount]);

  // Table checkbox handlers for "select all"
  const handleSelectAll = useCallback(
    (e) => {
      if (e.target.checked) {
        setSelectedRows(invoices.map((inv) => inv.id));
      } else {
        setSelectedRows([]);
      }
    },
    [invoices]
  );

  // --- Render ---
  return (
    <Box className="dashboard-container">
      <Typography variant="h4" className="dashboard-title">
        Dashboard
      </Typography>
      
      {/* Row 1: Balances */}
      <Grid container spacing={2} className="balances-row">
        <Grid item xs={12} md={6}>
          <div className="gradient-box">
            <Typography variant="h5" className="balance-title">
              Total Balance
            </Typography>
            <Typography variant="h3" className="balance-amount">
              £{doneBalance.toFixed(2)}
            </Typography>
          </div>
        </Grid>
        <Grid item xs={12} md={6}>
          <div className="gradient-box">
            <Typography variant="h5" className="balance-title">
              Pending Balance
            </Typography>
            <Typography variant="h3" className="balance-amount">
              £{pendingBalance.toFixed(2)}
            </Typography>
          </div>
        </Grid>
      </Grid>

      {/* Row 2: Transactions */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card className="transactions-card">
            <CardContent>
              <Box className="transactions-header">
                <Typography variant="h6" className="transactions-title">
                  Payment History
                </Typography>
                <FormControl size="small" className="action-dropdown">
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={tableAction}
                    label="Action"
                    onChange={handleTableActionChange}
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Done">Done</MenuItem>
                    <MenuItem value="Delete">Delete</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="caption" className="transactions-caption">
                Your invoice history
              </Typography>
              <TableContainer component={Paper} className="transactions-table-container">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow className="transactions-table-head">
                      <TableCell className="table-cell-checkbox">
                        <Checkbox
                          className="select-all-checkbox"
                          indeterminate={
                            selectedRows.length > 0 && selectedRows.length < invoices.length
                          }
                          checked={invoices.length > 0 && selectedRows.length === invoices.length}
                          onChange={handleSelectAll}
                          aria-label="Select all invoices"
                        />
                      </TableCell>
                      <TableCell className="table-cell">Builder</TableCell>
                      <TableCell className="table-cell">Date</TableCell>
                      <TableCell className="table-cell">Status</TableCell>
                      <TableCell className="table-cell">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((inv) => {
                      const isChecked = selectedRows.includes(inv.id);
                      return (
                        <TableRow key={inv.id} hover className="transaction-row">
                          <TableCell className="table-cell-checkbox">
                            <Checkbox
                              className="row-checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                handleRowCheckbox(inv.id, e.target.checked)
                              }
                              aria-label={`Select invoice ${inv.id}`}
                            />
                          </TableCell>
                          <TableCell className="table-cell">{inv.builderName}</TableCell>
                          <TableCell className="table-cell">{inv.date}</TableCell>
                          <TableCell className={`table-cell status-${inv.status.toLowerCase()}`}>
                            {inv.status}
                          </TableCell>
                          <TableCell className="table-cell">
                            +£{Number(inv.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: UK Builders and Top Builders */}
      <Grid container spacing={2}>
        {/* UK Builders Section */}
        <Grid item xs={12} md={6}>
          <Card className="uk-builders-card">
            <CardContent>
              <Box className="section-header">
                <Typography variant="h6" className="section-title">
                  UK Builders
                </Typography>
              </Box>
              <Box className="uk-builders-add-new">
                <Box className="add-new-builder" onClick={handleAddNewClick} role="button" tabIndex={0}>
                  <Box className="add-new-icon" aria-hidden="true">+</Box>
                  <Typography variant="caption" className="add-new-text">
                    Add new
                  </Typography>
                </Box>
                <Box
                  ref={scrollRef}
                  className={`builders-scroller ${isDown ? "active-scroll" : ""}`}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  role="region"
                  aria-label="UK Builders scroller"
                >
                  {builders.map((b) => (
                    <Box
                      key={b.id}
                      onClick={() => handleSelectBuilder(b.id)}
                      className={`builder-item ${selectedBuilderId === b.id ? "selected-builder" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select builder ${b.name}`}
                    >
                      <Avatar alt={b.name} src={b.image} className="builder-avatar" />
                      <Typography variant="caption" className="builder-name">
                        {b.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box className="uk-builders-actions">
                <Box className="amount-input-container">
                  <Typography variant="caption" className="amount-label">
                    Amount (£)
                  </Typography>
                  <TextField
                    type="number"
                    step="0.01"
                    size="small"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="amount-input"
                    inputProps={{ "aria-label": "Invoice Amount" }}
                  />
                </Box>
                <Button
                  variant="contained"
                  disabled={disableRequest}
                  onClick={handleRequestClick}
                  className={`request-button ${disableRequest ? "disabled-button" : ""}`}
                  aria-label="Request Invoice"
                >
                  Request
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Builders Section */}
        <Grid item xs={12} md={6}>
          <Card className="top-builders-card">
            <CardContent>
              <Box className="section-header">
                <Typography variant="h6" className="section-title">
                  Top Builders
                </Typography>
              </Box>
              <Box className="top-builders-list">
                {topBuilders.map((builder) => (
                  <Box key={builder.id} className="top-builder-item">
                    <Avatar alt={builder.name} src={builder.image} className="top-builder-avatar" />
                    <Typography variant="body2" className="top-builder-name">
                      {builder.name}
                    </Typography>
                    <Typography variant="caption" className="top-builder-amount">
                      £{builder.totalPaid.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add New Builder Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        className="add-builder-dialog"
        aria-labelledby="add-builder-dialog-title"
      >
        <DialogTitle id="add-builder-dialog-title" className="dialog-title">
          <Box component="img" src="/EABuildingWorksLTD.png" alt="Logo" className="dialog-logo" />
          <Typography variant="h6" className="dialog-subtitle">
            Please add builder details below
          </Typography>
        </DialogTitle>
        <DialogContent className="dialog-content">
          <TextField
            label="Builder Name"
            fullWidth
            value={newBuilderName}
            onChange={(e) => setNewBuilderName(e.target.value)}
            className="builder-name-input"
            inputProps={{ "aria-label": "New Builder Name" }}
          />
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCloseDialog} variant="outlined" className="cancel-button" aria-label="Cancel adding builder">
            Cancel
          </Button>
          <Button onClick={handleAddBuilder} variant="contained" className="add-button" aria-label="Add builder">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

