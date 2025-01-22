// Dashboard.js

import React, { useRef, useState, useEffect } from "react";
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
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import "./Dashboard.css";

// Utility for formatting the date to DD/MM/YYYY
function formatUKDate(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  // Builders
  const [builders, setBuilders] = useState([
    { id: 1, name: "N.Hussain", image: "https://via.placeholder.com/40" },
    { id: 2, name: "Z.Khan", image: "https://via.placeholder.com/40" },
    { id: 3, name: "H.Ali", image: "https://via.placeholder.com/40" },
    { id: 4, name: "M.Ahmed", image: "https://via.placeholder.com/40" },
    { id: 5, name: "F.Khan", image: "https://via.placeholder.com/40" },
  ]);

  // Invoice data
  const [invoiceNumber, setInvoiceNumber] = useState(10001);
  const [invoices, setInvoices] = useState([]);

  // On mount, load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("invoices");
    if (saved) {
      setInvoices(JSON.parse(saved));
    }
  }, []);

  // Save whenever invoices changes
  useEffect(() => {
    localStorage.setItem("invoices", JSON.stringify(invoices));
  }, [invoices]);

  // For multi-select
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableAction, setTableAction] = useState("");

  // For choosing a builder & invoice
  const [selectedBuilderId, setSelectedBuilderId] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState("100");
  const disableRequest =
    !selectedBuilderId || !invoiceAmount || Number(invoiceAmount) < 1;

  // Add new builder dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [newBuilderName, setNewBuilderName] = useState("");

  // For the horizontal scroller
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // The dynamic total = sum of amounts for all "Done"
  const doneBalance = invoices.reduce((acc, inv) => {
    if (inv.status === "Done") {
      return acc + Number(inv.amount);
    }
    return acc;
  }, 0);

  // The dynamic pending balance (sum of "Pending" transactions)
  const pendingBalance = invoices.reduce((acc, inv) => {
    if (inv.status === "Pending") {
      return acc + Number(inv.amount);
    }
    return acc;
  }, 0);

  // Calculate total payments per builder
  const builderPayments = builders.map((builder) => {
    const totalPaid = invoices
      .filter(
        (inv) => inv.builderName === builder.name && inv.status === "Done"
      )
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    return { ...builder, totalPaid };
  });

  // Sort builders by totalPaid descending and get the top 5
  const topBuilders = [...builderPayments]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 5);

  // ---- "Add new" builder dialog handlers
  const handleAddNewClick = () => setOpenDialog(true);
  const handleClose = () => {
    setOpenDialog(false);
    setNewBuilderName("");
  };
  const handleAddBuilder = () => {
    if (!newBuilderName.trim()) return;
    const newId = builders.length + 1;
    setBuilders([
      ...builders,
      {
        id: newId,
        name: newBuilderName,
        image: "https://via.placeholder.com/40",
      },
    ]);
    handleClose();
  };

  // Select builder for invoice
  const handleSelectBuilder = (builderId) => {
    setSelectedBuilderId(builderId);
  };

  // Scroll drag in "UK Builders"
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };

  // For checking/unchecking individual rows
  const handleRowCheckbox = (invId, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, invId]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== invId));
    }
  };

  // The Action dropdown for selected rows
  const handleTableActionChange = (e) => {
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

    // Clear selection + reset
    setSelectedRows([]);
    setTableAction("");
  };

  // Generate invoice with a guaranteed-unique ID
  const handleRequestClick = () => {
    if (disableRequest) return;

    const builder = builders.find((b) => b.id === selectedBuilderId);
    if (!builder) return;

    const issueDateObj = new Date();
    const invoiceDateIssued = formatUKDate(issueDateObj);
    const fileDate = invoiceDateIssued.replace(/\//g, "-"); // "DD-MM-YYYY"
    const currentInvoiceNo = invoiceNumber;
    const dueDateObj = new Date(
      issueDateObj.getTime() + 7 * 24 * 60 * 60 * 1000
    );
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

    // 2) Insert the new invoice at the TOP of the list:
    const newInvoice = {
      id: uniqueId,
      builderName: builder.name,
      date: invoiceDateIssued,
      status: "Pending",
      amount: Number(invoiceAmount).toFixed(2),
    };

    // add new invoice to the FRONT so it appears at the top
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  return (
    <Box className="dashboard-container">
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

                {/* The single drop-down to apply to selected rows */}
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

              {/* Table container (scroll for ~7 transactions) */}
              <TableContainer component={Paper} className="transactions-table-container">
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow className="transactions-table-head">
                      {/* SELECT ALL CHECKBOX in header */}
                      <TableCell className="table-cell-checkbox">
                        <Checkbox
                          className="select-all-checkbox"
                          indeterminate={
                            selectedRows.length > 0 &&
                            selectedRows.length < invoices.length
                          }
                          checked={
                            invoices.length > 0 &&
                            selectedRows.length === invoices.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              // select all invoice IDs
                              setSelectedRows(invoices.map((inv) => inv.id));
                            } else {
                              // unselect all
                              setSelectedRows([]);
                            }
                          }}
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
                      // each invoice has a truly unique id
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
                            />
                          </TableCell>
                          <TableCell className="table-cell">
                            {inv.builderName}
                          </TableCell>
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

              {/* Center-aligned "Add new" */}
              <Box className="uk-builders-add-new">
                <Box
                  className="add-new-builder"
                  onClick={handleAddNewClick}
                >
                  <Box className="add-new-icon">+</Box>
                  <Typography variant="caption" className="add-new-text">
                    Add new
                  </Typography>
                </Box>

                {/* SCROLLER for builders */}
                <Box
                  ref={scrollRef}
                  className={`builders-scroller ${isDown ? "active-scroll" : ""}`}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                >
                  {builders.map((b) => (
                    <Box
                      key={b.id}
                      onClick={() => handleSelectBuilder(b.id)}
                      className={`builder-item ${selectedBuilderId === b.id ? "selected-builder" : ""}`}
                    >
                      <Avatar
                        alt={b.name}
                        src={b.image}
                        className="builder-avatar"
                      />
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
                  />
                </Box>

                <Button
                  variant="contained"
                  disabled={disableRequest}
                  onClick={handleRequestClick}
                  className={`request-button ${disableRequest ? "disabled-button" : ""}`}
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
                    <Avatar
                      alt={builder.name}
                      src={builder.image}
                      className="top-builder-avatar"
                    />
                    <Typography variant="body2" className="top-builder-name">
                      {builder.name}
                    </Typography>
                    <Typography variant="caption" className="top-builder-amount">
                      £{builder.totalPaid.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box className="top-builders-button-container">
                <Button
                  component={Link}
                  to="/dashboard/earnings"
                  variant="contained"
                  className="view-more-button"
                >
                  View More
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add New Builder Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        className="add-builder-dialog"
      >
        <DialogTitle className="dialog-title">
          <Box
            component="img"
            src="/EABuildingWorksLTD.png"
            alt="Logo"
            className="dialog-logo"
          />
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
          />
        </DialogContent>

        <DialogActions className="dialog-actions">
          <Button
            onClick={handleClose}
            variant="outlined"
            className="cancel-button"
          >
            Cancel
          </Button>

          <Button
            onClick={handleAddBuilder}
            variant="contained"
            className="add-button"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
