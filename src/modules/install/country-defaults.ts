export type CountryDefaults = {
  currency: string;
  locale: string;
  timezone: string;
  phoneRegion: string;
  taxIdLabel: string;
  taxRate: number;
};

const FALLBACK: CountryDefaults = {
  currency: "USD",
  locale: "en-US",
  timezone: "UTC",
  phoneRegion: "US",
  taxIdLabel: "Tax ID",
  taxRate: 0,
};

const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  IN: {
    currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    phoneRegion: "IN",
    taxIdLabel: "GSTIN",
    taxRate: 0,
  },
  US: {
    currency: "USD",
    locale: "en-US",
    timezone: "America/New_York",
    phoneRegion: "US",
    taxIdLabel: "Tax ID",
    taxRate: 0,
  },
  GB: {
    currency: "GBP",
    locale: "en-GB",
    timezone: "Europe/London",
    phoneRegion: "GB",
    taxIdLabel: "VAT",
    taxRate: 0,
  },
  AE: {
    currency: "AED",
    locale: "en-AE",
    timezone: "Asia/Dubai",
    phoneRegion: "AE",
    taxIdLabel: "TRN",
    taxRate: 0,
  },
  AU: {
    currency: "AUD",
    locale: "en-AU",
    timezone: "Australia/Sydney",
    phoneRegion: "AU",
    taxIdLabel: "ABN",
    taxRate: 0,
  },
  SG: {
    currency: "SGD",
    locale: "en-SG",
    timezone: "Asia/Singapore",
    phoneRegion: "SG",
    taxIdLabel: "GST Reg No",
    taxRate: 0,
  },
  DE: {
    currency: "EUR",
    locale: "de-DE",
    timezone: "Europe/Berlin",
    phoneRegion: "DE",
    taxIdLabel: "VAT",
    taxRate: 0,
  },
};

export const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "BD", label: "Bangladesh" },
  { value: "BE", label: "Belgium" },
  { value: "BR", label: "Brazil" },
  { value: "CA", label: "Canada" },
  { value: "DK", label: "Denmark" },
  { value: "EG", label: "Egypt" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "HK", label: "Hong Kong" },
  { value: "IN", label: "India" },
  { value: "ID", label: "Indonesia" },
  { value: "IE", label: "Ireland" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "KE", label: "Kenya" },
  { value: "MY", label: "Malaysia" },
  { value: "MX", label: "Mexico" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "NG", label: "Nigeria" },
  { value: "NO", label: "Norway" },
  { value: "PK", label: "Pakistan" },
  { value: "PH", label: "Philippines" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "QA", label: "Qatar" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "SG", label: "Singapore" },
  { value: "ZA", label: "South Africa" },
  { value: "KR", label: "South Korea" },
  { value: "ES", label: "Spain" },
  { value: "LK", label: "Sri Lanka" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "TH", label: "Thailand" },
  { value: "TR", label: "Turkey" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

export function defaultsForCountry(iso2: string): CountryDefaults {
  const code = iso2.toUpperCase();
  return COUNTRY_DEFAULTS[code] ?? FALLBACK;
}
