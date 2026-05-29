/**
 * Server-only PDF generation for invoices.
 * NEVER import this file from a "use client" component.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
 page: {
  fontFamily: "Helvetica",
  fontSize: 10,
  padding: 40,
  color: "#1a1a1a",
  backgroundColor: "#ffffff",
 },
 header: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 32,
  borderBottomWidth: 2,
  borderBottomColor: "#2563eb",
  paddingBottom: 16,
 },
 companyName: {
  fontSize: 22,
  fontFamily: "Helvetica-Bold",
  color: "#2563eb",
 },
 companyTagline: {
  fontSize: 9,
  color: "#6b7280",
  marginTop: 2,
 },
 invoiceTitle: {
  fontSize: 22,
  fontFamily: "Helvetica-Bold",
  color: "#374151",
  textAlign: "right",
 },
 invoiceMeta: {
  fontSize: 9,
  color: "#6b7280",
  textAlign: "right",
  marginTop: 3,
 },
 section: {
  marginBottom: 20,
 },
 sectionTitle: {
  fontSize: 9,
  fontFamily: "Helvetica-Bold",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
 },
 row: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 4,
 },
 label: {
  color: "#6b7280",
  width: "35%",
 },
 value: {
  color: "#1a1a1a",
  width: "63%",
  textAlign: "right",
 },
 tableHeader: {
  flexDirection: "row",
  backgroundColor: "#f3f4f6",
  padding: "6 8",
  borderRadius: 4,
  marginBottom: 4,
 },
 tableHeaderText: {
  fontFamily: "Helvetica-Bold",
  fontSize: 9,
  color: "#374151",
 },
 tableRow: {
  flexDirection: "row",
  padding: "5 8",
  borderBottomWidth: 1,
  borderBottomColor: "#f3f4f6",
 },
 col1: { width: "50%" },
 col2: { width: "25%", textAlign: "right" },
 col3: { width: "25%", textAlign: "right" },
 totalBox: {
  marginTop: 12,
  backgroundColor: "#eff6ff",
  padding: "10 12",
  borderRadius: 6,
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
 },
 totalLabel: {
  fontFamily: "Helvetica-Bold",
  fontSize: 11,
  color: "#1d4ed8",
  marginRight: 16,
 },
 totalValue: {
  fontFamily: "Helvetica-Bold",
  fontSize: 14,
  color: "#1d4ed8",
 },
 footer: {
  position: "absolute",
  bottom: 30,
  left: 40,
  right: 40,
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopWidth: 1,
  borderTopColor: "#e5e7eb",
  paddingTop: 8,
 },
 footerText: {
  fontSize: 8,
  color: "#9ca3af",
 },
});

const dtFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" });
const currency = new Intl.NumberFormat("en-IN", {
 style: "currency",
 currency: "INR",
 maximumFractionDigits: 0,
});

export type InvoicePDFData = {
 invoiceNumber: string;
 issuedAt: Date;
 dueAt?: Date | null;
 customerName: string;
 customerEmail: string;
 customerPhone?: string | null;
 branchName: string;
 pickupAddress: string;
 dropAddress: string;
 pickupAt: Date;
 fareEstimate?: number | null;
 fareFinal?: number | null;
 bookingRef: string;
};

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
 const fare = data.fareFinal ?? data.fareEstimate ?? 0;

 return (
  <Document>
   <Page size="A4" style={styles.page}>
    {/* Header */}
    <View style={styles.header}>
     <View>
      <Text style={styles.companyName}>CabFleet</Text>
      <Text style={styles.companyTagline}>Fleet Management &amp; Transportation</Text>
     </View>
     <View>
      <Text style={styles.invoiceTitle}>INVOICE</Text>
      <Text style={styles.invoiceMeta}>#{data.invoiceNumber}</Text>
      <Text style={styles.invoiceMeta}>Issued: {dtFmt.format(data.issuedAt)}</Text>
      {data.dueAt && (
       <Text style={styles.invoiceMeta}>Due: {dtFmt.format(data.dueAt)}</Text>
      )}
     </View>
    </View>

    {/* Bill to */}
    <View style={styles.section}>
     <Text style={styles.sectionTitle}>Bill To</Text>
     <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
      {data.customerName}
     </Text>
     <Text style={{ color: "#6b7280" }}>{data.customerEmail}</Text>
     {data.customerPhone && (
      <Text style={{ color: "#6b7280" }}>{data.customerPhone}</Text>
     )}
    </View>

    {/* Booking details */}
    <View style={styles.section}>
     <Text style={styles.sectionTitle}>Booking Details</Text>
     <View style={styles.row}>
      <Text style={styles.label}>Reference</Text>
      <Text style={styles.value}>#{data.bookingRef}</Text>
     </View>
     <View style={styles.row}>
      <Text style={styles.label}>Branch</Text>
      <Text style={styles.value}>{data.branchName}</Text>
     </View>
     <View style={styles.row}>
      <Text style={styles.label}>Pickup Date &amp; Time</Text>
      <Text style={styles.value}>
       {new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeStyle: "short",
       }).format(data.pickupAt)}
      </Text>
     </View>
     <View style={styles.row}>
      <Text style={styles.label}>Pickup Address</Text>
      <Text style={styles.value}>{data.pickupAddress}</Text>
     </View>
     <View style={styles.row}>
      <Text style={styles.label}>Drop Address</Text>
      <Text style={styles.value}>{data.dropAddress}</Text>
     </View>
    </View>

    {/* Line items */}
    <View style={styles.section}>
     <Text style={styles.sectionTitle}>Charges</Text>
     <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
      <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
      <Text style={[styles.tableHeaderText, styles.col3]}>Amount</Text>
     </View>
     <View style={styles.tableRow}>
      <Text style={styles.col1}>Transportation Service</Text>
      <Text style={styles.col2}>1</Text>
      <Text style={styles.col3}>{currency.format(fare)}</Text>
     </View>
    </View>

    {/* Total */}
    <View style={styles.totalBox}>
     <Text style={styles.totalLabel}>Total</Text>
     <Text style={styles.totalValue}>{currency.format(fare)}</Text>
    </View>

    {/* Footer */}
    <View style={styles.footer}>
     <Text style={styles.footerText}>CabFleet — Thank you for your business.</Text>
     <Text style={styles.footerText}>Invoice #{data.invoiceNumber}</Text>
    </View>
   </Page>
  </Document>
 );
}
