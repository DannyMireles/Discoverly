import Image from "next/image";
import Link from "next/link";

export function Logo({
  href = "/company/dashboard",
  size = 36,
  showWordmark = true,
  className = "",
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-[#11101f] hover:opacity-90 ${className}`}
      aria-label="Discoverly"
    >
      <Image src="/logo.png" alt="" width={size} height={size} priority />
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight">Discoverly</span>
      ) : null}
    </Link>
  );
}
