import { Metadata } from "next";
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/common/StatCard";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Alert from "@/components/ui/alert/Alert";

export const metadata: Metadata = {
  title: "UI Showcase | CabFleet",
  description: "Design token and component reference for CabFleet UI",
};

const STATUS_TONES: { tone: StatusTone; label: string }[] = [
  { tone: "success", label: "Success" },
  { tone: "warning", label: "Warning" },
  { tone: "error", label: "Error" },
  { tone: "info", label: "Info" },
  { tone: "neutral", label: "Neutral" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-title font-semibold text-default">{title}</h2>
      <div className="rounded-2xl border border-default bg-surface-elevated p-6">
        {children}
      </div>
    </div>
  );
}

function SwatchRow({ bg, fg, bgName, fgName }: { bg: string; fg: string; bgName: string; fgName: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${bg}`}>
      <p className={`text-sm font-medium ${fg}`}>
        {bgName} / {fgName}
      </p>
      <p className={`text-xs ${fg} opacity-75`}>
        Verify WCAG contrast — text should be clearly readable on this background.
      </p>
    </div>
  );
}

export default function UIShowcasePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="UI Showcase" />
      <div className="space-y-10">

        {/* ── Semantic Color Tokens ──────────────────────────────────────── */}
        <Section title="Semantic color tokens">
          <div className="space-y-4">
            <h3 className="text-body font-medium text-default">Surface hierarchy</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { cls: "bg-surface",         label: "bg-surface (page bg)" },
                { cls: "bg-surface-elevated", label: "bg-surface-elevated (cards)" },
                { cls: "bg-surface-inset",    label: "bg-surface-inset (inputs, wells)" },
                { cls: "bg-surface-sidebar",  label: "bg-surface-sidebar (nav chrome)" },
                { cls: "bg-surface-modal",    label: "bg-surface-modal (dialogs)" },
              ].map(({ cls, label }) => (
                <div key={cls} className={`rounded-lg border border-default px-3 py-3 ${cls}`}>
                  <p className="text-xs font-mono text-default">{cls}</p>
                  <p className="mt-1 text-caption text-muted">{label}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-6 text-body font-medium text-default">Subtle tinted pairs (bg + fg, WCAG-safe)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <SwatchRow bg="bg-primary-subtle"  fg="text-on-primary-subtle"  bgName="bg-primary-subtle"  fgName="text-on-primary-subtle" />
              <SwatchRow bg="bg-success-subtle"  fg="text-on-success-subtle"  bgName="bg-success-subtle"  fgName="text-on-success-subtle" />
              <SwatchRow bg="bg-warning-subtle"  fg="text-on-warning-subtle"  bgName="bg-warning-subtle"  fgName="text-on-warning-subtle" />
              <SwatchRow bg="bg-error-subtle"    fg="text-on-error-subtle"    bgName="bg-error-subtle"    fgName="text-on-error-subtle" />
            </div>

            <h3 className="mt-6 text-body font-medium text-default">Text tokens</h3>
            <div className="space-y-2">
              <p className="text-default">text-default — primary body copy</p>
              <p className="text-muted">text-muted — secondary / supporting text</p>
              <p className="text-on-primary-subtle">text-on-primary-subtle — on primary-subtle bg</p>
              <p className="text-on-success-subtle">text-on-success-subtle — on success-subtle bg</p>
            </div>

            <h3 className="mt-6 text-body font-medium text-default">Border tokens</h3>
            <div className="space-y-2">
              <div className="rounded-lg border border-default px-3 py-2">
                <p className="text-caption text-muted">border-default</p>
              </div>
              <div className="rounded-lg border border-strong px-3 py-2">
                <p className="text-caption text-muted">border-strong</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Typography tokens ──────────────────────────────────────────── */}
        <Section title="Typography tokens">
          <div className="space-y-4">
            <p className="text-display font-heading text-default">text-display / font-heading</p>
            <p className="text-title font-heading text-default">text-title / font-heading</p>
            <p className="text-body font-body text-default">text-body / font-body — default body size</p>
            <p className="text-caption font-body text-muted">text-caption / font-body — labels and hints</p>
            <p className="font-mono text-body text-default">font-mono — code and data</p>
          </div>
        </Section>

        {/* ── StatusBadge tones ──────────────────────────────────────────── */}
        <Section title="StatusBadge tones">
          <div className="flex flex-wrap gap-3">
            {STATUS_TONES.map(({ tone, label }) => (
              <StatusBadge key={tone} tone={tone}>{label}</StatusBadge>
            ))}
          </div>
        </Section>

        {/* ── StatCard tones ─────────────────────────────────────────────── */}
        <Section title="StatCard tones">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Default"  value="42"  tone="default" />
            <StatCard label="Success"  value="18"  tone="success" />
            <StatCard label="Warning"  value="7"   tone="warning" />
            <StatCard label="Error"    value="3"   tone="error" />
            <StatCard label="Info"     value="24"  tone="info" />
            <StatCard label="Neutral"  value="99"  tone="neutral" />
          </div>
        </Section>

        {/* ── Button intents ─────────────────────────────────────────────── */}
        <Section title="Button intents (CVA)">
          <div className="flex flex-wrap gap-3">
            <Button intent="primary">Primary</Button>
            <Button intent="outline">Outline</Button>
            <Button intent="ghost">Ghost</Button>
            <Button intent="destructive">Destructive</Button>
            <Button intent="primary" disabled>Disabled</Button>
            <Button intent="primary" size="sm">Small</Button>
          </div>
        </Section>

        {/* ── Badge variants ─────────────────────────────────────────────── */}
        <Section title="Badge variants (CVA)">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {(["primary","success","error","warning","info","light","dark"] as const).map((color) => (
                <Badge key={color} variant="light" color={color}>{color}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {(["primary","success","error","warning","info","light","dark"] as const).map((color) => (
                <Badge key={color} variant="solid" color={color}>{color}</Badge>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Alert variants ─────────────────────────────────────────────── */}
        <Section title="Alert variants (CVA)">
          <div className="space-y-4">
            <Alert variant="success" title="Success" message="Operation completed successfully." />
            <Alert variant="warning" title="Warning" message="Check this before proceeding." />
            <Alert variant="error"   title="Error"   message="Something went wrong. Please try again." />
            <Alert variant="info"    title="Info"    message="Here is some useful information." />
          </div>
        </Section>

        {/* ── Spacing scale ──────────────────────────────────────────────── */}
        <Section title="Spacing scale reference">
          <p className="mb-4 text-caption text-muted">
            Preferred spacing: 2, 4, 6, 8. Avoid off-scale values in feature code.
          </p>
          <div className="flex items-end gap-4">
            {[2, 4, 6, 8].map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <div
                  className="bg-primary-subtle border border-default rounded"
                  style={{ width: `${n * 4}px`, height: `${n * 4}px` }}
                />
                <p className="text-caption text-muted">p-{n}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Radius tiers ───────────────────────────────────────────────── */}
        <Section title="Radius tiers reference">
          <p className="mb-4 text-caption text-muted">
            Preferred radius: sm, md, lg, xl, full. Avoid arbitrary rounded-[17px] in feature code.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {[
              { cls: "rounded-sm",   label: "rounded-sm" },
              { cls: "rounded-md",   label: "rounded-md" },
              { cls: "rounded-lg",   label: "rounded-lg" },
              { cls: "rounded-xl",   label: "rounded-xl" },
              { cls: "rounded-2xl",  label: "rounded-2xl" },
              { cls: "rounded-full", label: "rounded-full" },
            ].map(({ cls, label }) => (
              <div key={cls} className="flex flex-col items-center gap-2">
                <div className={`h-12 w-12 bg-primary-subtle border border-default ${cls}`} />
                <p className="text-caption text-muted whitespace-nowrap">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Verification checklist ─────────────────────────────────────── */}
        <ComponentCard title="Verification checklist" desc="Run through this before marking a redesign complete">
          <div className="space-y-2 text-sm text-default">
            {[
              "All subtle tint pairs are legible in light and dark mode",
              "Surface tokens correctly distinguish page / card / input / sidebar",
              "StatusBadge all 5 tones render correctly in light and dark",
              "Button intents match design: primary, outline, ghost, destructive",
              "Typography scale looks correct at display / title / body / caption",
              "StatCards render with correct tone backgrounds",
              "ESLint shows 0 errors (warnings are tracked, not blocking)",
              "No bg-brand-*, text-gray-* or STATUS_COLOR found in src/app/** or src/modules/**",
            ].map((item, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-default accent-primary" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </ComponentCard>

      </div>
    </div>
  );
}
