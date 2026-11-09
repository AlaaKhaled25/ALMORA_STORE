import { whatsappUrl } from "@/lib/brand";

type WhatsAppButtonProps = {
  message: string;
  label?: string;
  className?: string;
};

export default function WhatsAppButton({
  message,
  label = "اسأل عن المنتج",
  className = "",
}: WhatsAppButtonProps) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-line bg-white px-5 text-sm font-semibold text-brand-ink transition hover:border-[#128c7e]/30 hover:bg-[#128c7e]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128c7e] ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5 text-[#128c7e]"
        aria-hidden="true"
      >
        <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1 0 12.04 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12.04 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5 0-.2 0-.3-.1-.5-.1-.2-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .2-1.1-.1-.2-.2-.2-.5-.4Z" />
      </svg>
      {label}
    </a>
  );
}
