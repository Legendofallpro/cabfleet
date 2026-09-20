/**
 * Server-only PDF generation for invoices.
 * NEVER import this file from a "use client" component.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import { formatDateTime } from "@/lib/format/datetime";
import { formatMoney } from "@/lib/format/money";

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

export type InvoicePDFData = {
 invoiceNumber: string;
 issuedAt: Date;
 dueAt?: Date | null;
 orgName: string;
 gstin?: string | null;
 gstRate: number;
 sacCode: string;
 customerName: string;
 customerEmail: string;
 customerPhone?: string | null;
 branchName: string;
 pickupAddress: string;
 dropAddress: string;
 pickupAt: Date;
 bookingRef: string;
 transport: number;
 toll: number;
 parking: number;
 gst: number;
 total: number;
 locale: string;
 currency: string;
 timezone: string;
};

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
 const showGst = data.gstRate > 0 && data.gst > 0;
 const money = (n: number) =>
  formatMoney(n, { locale: data.locale, currency: data.currency });
 const issued = formatDateTime(data.issuedAt, {
  locale: data.locale,
  timeZone: data.timezone,
  dateStyle: "long",
 });
 const due = data.dueAt
  ? formatDateTime(data.dueAt, {
     locale: data.locale,
     timeZone: data.timezone,
     dateStyle: "long",
    })
  : null;
 const pickup = formatDateTime(data.pickupAt, {
  locale: data.locale,
  timeZone: data.timezone,
  dateStyle: "long",
  timeStyle: "short",
 });

 return (
  <Document>
   <Page size="A4" style={styles.page}>
    <View style={styles.header}>
     <View>
      <Text style={styles.companyName}>{data.orgName}</Text>
      <Text style={styles.companyTagline}>Fleet Management &amp; Transportation</Text>
      {data.gstin ? (
       <Text style={styles.companyTagline}>GSTIN: {data.gstin}</Text>
      ) : null}
     </View>
     <View>
      <Text style={styles.invoiceTitle}>INVOICE</Text>
      <Text style={styles.invoiceMeta}>#{data.invoiceNumber}</Text>
      <Text style={styles.invoiceMeta}>Issued: {issued}</Text>
      {data.dueAt && due && (
       <Text style={styles.invoiceMeta}>Due: {due}</Text>
      )}
     </View>
    </View>

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
      <Text style={styles.value}>{pickup}</Text>
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

    <View style={styles.section}>
     <Text style={styles.sectionTitle}>Charges</Text>
     <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, styles.col1]}>Description</Text>
      <Text style={[styles.tableHeaderText, styles.col2]}>SAC</Text>
      <Text style={[styles.tableHeaderText, styles.col3]}>Amount</Text>
     </View>
     <View style={styles.tableRow}>
      <Text style={styles.col1}>Passenger transport</Text>
      <Text style={styles.col2}>{data.sacCode}</Text>
      <Text style={styles.col3}>{money(data.transport)}</Text>
     </View>
     {data.toll > 0 && (
      <View style={styles.tableRow}>
       <Text style={styles.col1}>Toll</Text>
       <Text style={styles.col2}>—</Text>
       <Text style={styles.col3}>{money(data.toll)}</Text>
      </View>
     )}
     {data.parking > 0 && (
      <View style={styles.tableRow}>
       <Text style={styles.col1}>Parking</Text>
       <Text style={styles.col2}>—</Text>
       <Text style={styles.col3}>{money(data.parking)}</Text>
      </View>
     )}
     {showGst && (
      <View style={styles.tableRow}>
       <Text style={styles.col1}>GST {data.gstRate}%</Text>
       <Text style={styles.col2}>—</Text>
       <Text style={styles.col3}>{money(data.gst)}</Text>
      </View>
     )}
    </View>

    <View style={styles.totalBox}>
     <Text style={styles.totalLabel}>Total</Text>
     <Text style={styles.totalValue}>{money(data.total)}</Text>
    </View>

    <View style={styles.footer}>
     <Text style={styles.footerText}>
      {data.orgName} — Thank you for your business.
     </Text>
     <Text style={styles.footerText}>Invoice #{data.invoiceNumber}</Text>
    </View>
   </Page>
  </Document>
 );
}
