"use client";

type Props = {
  phone: string | null | undefined;
  text: string;
};

function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppShareButton({ phone, text }: Props) {
  if (!phone) {
    return (
      <button
        type="button"
        className="inline-flex h-10 items-center rounded-lg border border-default px-4 text-sm text-muted"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
        }}
      >
        Copy trip text
      </button>
    );
  }

  return (
    <a
      href={waLink(phone, text)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
    >
      Share on WhatsApp
    </a>
  );
}
