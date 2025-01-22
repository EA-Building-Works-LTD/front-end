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
import { styled, textAlign } from "@mui/system";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";

// Utility for formatting the date to DD/MM/YYYY
function formatUKDate(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, "0");
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

// Gradient box for balances
const GradientBox = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #7D9B76 0%, #AEC4A5 100%)",
  borderRadius: theme.shape.borderRadius * 2,
  color: "#fff",
  padding: theme.spacing(3),
}));

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

  // Sort builders by totalPaid descending and get the top 3
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
    <Box sx={{ p: 2, minHeight: "100vh", backgroundColor: "#F6F6F6" }}>
      {/* Row 1: Balances */}
      <Grid container spacing={2} sx={{ paddingBottom: 2 }}>
        <Grid item xs={12} md={6}>
          <GradientBox>
            <Typography variant="h5" fontWeight="bold">
              Total Balance
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              £{doneBalance.toFixed(2)}
            </Typography>
          </GradientBox>
        </Grid>
        <Grid item xs={12} md={6}>
          <GradientBox>
            <Typography variant="h5" fontWeight="bold">
              Pending Balance
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              £{pendingBalance.toFixed(2)}
            </Typography>
          </GradientBox>
        </Grid>
      </Grid>
      {/* Row 2: Transactions */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, mb: 2 }}>
            <CardContent>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Payment History
                </Typography>

                {/* The single drop-down to apply to selected rows */}
                <FormControl size="small" sx={{ width: 150 }}>
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

              <Typography variant="caption" color="text.secondary">
                Your invoice history
              </Typography>

              {/* Table container (scroll for ~7 transactions) */}
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: 320,
                  mt: 1,
                  borderRadius: 2,
                  overflowY: "auto",
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#DCDCC6" }}>
                      {/* SELECT ALL CHECKBOX in header */}
                      <TableCell sx={{ px: 1 }}>
                        <Checkbox
                          sx={{ transform: "scale(0.5)", ml: -1.5 }}
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
                      <TableCell sx={{ px: 1 }}>
                        <strong>Builder</strong>
                      </TableCell>
                      <TableCell sx={{ px: 1 }}>
                        <strong>Date</strong>
                      </TableCell>
                      <TableCell sx={{ px: 1 }}>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell sx={{ px: 1 }}>
                        <strong>Amount</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((inv) => {
                      // each invoice has a truly unique id
                      const isChecked = selectedRows.includes(inv.id);

                      return (
                        <TableRow key={inv.id} hover>
                          <TableCell sx={{ px: 1 }}>
                            <Checkbox
                              sx={{
                                transform: "scale(0.5)",
                                ml: -1.5,
                              }}
                              checked={isChecked}
                              onChange={(e) =>
                                handleRowCheckbox(inv.id, e.target.checked)
                              }
                            />
                          </TableCell>
                          <TableCell sx={{ px: 1 }}>
                            {inv.builderName}
                          </TableCell>
                          <TableCell sx={{ px: 1 }}>{inv.date}</TableCell>
                          <TableCell sx={{ px: 1 }}>{inv.status}</TableCell>
                          <TableCell sx={{ px: 1 }}>
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

      {/* Row 3: UK Builders (50% width) */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: "#DCDCC6",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" fontWeight="bold">
                  UK Builders
                </Typography>
              </Box>

              {/* Center-aligned "Add new" */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 2,
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={handleAddNewClick}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "#E0E0E0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    +
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      textAlign: "center",
                    }}
                  >
                    Add new
                  </Typography>
                </Box>

                {/* SCROLLER for builders */}
                <Box
                  ref={scrollRef}
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    userSelect: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                    scrollbarWidth: "none",
                    cursor: isDown ? "grabbing" : "grab",
                    width: "100%",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                >
                  {builders.map((b) => (
                    <Box
                      key={b.id}
                      onClick={() => handleSelectBuilder(b.id)}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        border:
                          selectedBuilderId === b.id
                            ? "2px solid #5065f6"
                            : "2px solid transparent",
                        borderRadius: "50%",
                        p: 1,
                        cursor: "pointer",
                      }}
                    >
                      <Avatar
                        alt={b.name}
                        src={b.image}
                        sx={{
                          width: 40,
                          height: 40,
                          mb: 0.5,
                        }}
                      />
                      <Typography variant="caption">{b.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="caption" sx={{ mb: 0.5 }}>
                    Amount (£)
                  </Typography>
                  <TextField
                    type="number"
                    step="0.01"
                    size="small"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    sx={{
                      width: 120,
                    }}
                  />
                </Box>

                <Button
                  variant="contained"
                  disabled={disableRequest}
                  onClick={handleRequestClick}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: disableRequest ? "#ccc" : "#E0E0E0",
                    color: "#000",
                    "&:hover": {
                      backgroundColor: disableRequest ? "#ccc" : "#d0d0d0",
                    },
                  }}
                >
                  Request
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Builders Section */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: 3,
              backgroundColor: "#DCDCC6", // Match background of UK Builders
              // padding: 2, // Uniform padding
              height: "100%", // Match height with UK Builders
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Top Builders
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "left",
                  gap: 3,
                  mt: 3,
                }}
              >
                {topBuilders.map((builder) => (
                  <Box
                    key={builder.id}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      width: 70, // Consistent avatar and name block width
                    }}
                  >
                    <Avatar
                      alt={builder.name}
                      src={builder.image}
                      sx={{
                        width: 40,
                        height: 40,
                        mb: 0.5,
                        bgcolor: "#BDBDBD", // Match neutral avatar background
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.8rem", // Consistent text size
                      }}
                    >
                      {builder.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                      }}
                    >
                      £{builder.totalPaid.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "left", // Align button centrally
                }}
              >
                <Button
                  component={Link}
                  to="/dashboard/earnings"
                  variant="contained"
                  sx={{
                    backgroundColor: "#A2B99A", // Updated button color
                    color: "#fff",
                    textTransform: "none",
                    borderRadius: 2,
                    // padding: "6px 14px",
                    // fontSize: "0.9rem",
                    "&:hover": {
                      backgroundColor: "#8FA784", // Darker shade for hover effect
                    },
                    mt: 2.3,
                  }}
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
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
          <Box
            component="img"
            src="/EABuildingWorksLTD.png"
            alt="Logo"
            sx={{ width: 280, mb: 1 }}
          />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Please add builder details below
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: "center" }}>
          <TextField
            label="Builder Name"
            fullWidth
            value={newBuilderName}
            onChange={(e) => setNewBuilderName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              borderColor: "#DCDCC6",
              color: "#000",
              "&:hover": {
                backgroundColor: "#f0f0f0",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleAddBuilder}
            variant="contained"
            sx={{
              ml: 2,
              backgroundColor: "#DCDCC6",
              color: "#000",
              "&:hover": {
                backgroundColor: "#c5c0ad",
              },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
