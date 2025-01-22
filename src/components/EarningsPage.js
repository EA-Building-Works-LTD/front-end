import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer } from "@mui/material";

export default function EarningsPage({ invoices, builders }) {
  const [builderEarnings, setBuilderEarnings] = useState(null);

  useEffect(() => {
    // Filter transactions for "H.Ali" dynamically
    const selectedBuilder = builders.find((b) => b.name === "H.Ali");

    if (selectedBuilder) {
      const transactions = invoices.filter((inv) => inv.builderName === selectedBuilder.name);
      const totalEarnings = transactions.reduce((acc, inv) => acc + Number(inv.amount), 0);

      setBuilderEarnings({
        name: selectedBuilder.name,
        totalEarnings,
        transactions,
      });
    }
  }, [invoices, builders]);

  if (!builderEarnings) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Earnings Page
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading builder data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" fontWeight="bold">
        Earnings: {builderEarnings.name}
      </Typography>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Total Earnings: £{builderEarnings.totalEarnings.toFixed(2)}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Transactions
        </Typography>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {builderEarnings.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.status}</TableCell>
                  <TableCell>£{Number(transaction.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
