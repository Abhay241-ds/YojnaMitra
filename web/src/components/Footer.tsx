import Link from "next/link";
import LogoMark from "./LogoMarkFooter";
import { cacheLife } from "next/cache";

const explore = [
  { label: "Home", href: "/" },
  { label: "Schemes", href: "/schemes" },
  { label: "Eligibility", href: "/profile" },
  { label: "Support", href: "#" },
];

const account = [
  { label: "Login / Register", href: "/auth" },
  { label: "My Profile", href: "/profile" },
];

const linkClass =
  "transition-colors hover:text-white focus-visible:outline-white";

async function getCurrentYear() {
  "use cache";
  cacheLife("max");
  return new Date().getFullYear();
}

export default async function Footer() {
  const year = await getCurrentYear();
  

  return (
    <footer className="bg-[#102A4C] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] lg:px-12">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-3 focus-visible:outline-white">
            <LogoMark />
            <span className="text-2xl font-bold tracking-tight text-white">
              Yojna<span className="font-extrabold">Mitra</span>
            </span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed">
            Your trusted guide to central &amp; state government welfare schemes.
            Simple, transparent, and accessible.
          </p>
        </div>

        <nav aria-label="Explore">
          <h2 className="text-sm font-bold text-white">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {explore.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-bold text-white">Account</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {account.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs leading-relaxed md:flex-row md:items-center md:justify-between lg:px-12">
          <p>&copy; {year} YojnaMitra</p>
          <p className="max-w-2xl md:text-right">
            YojnaMitra is an independent information guide, not a government website.
            Please confirm details on the official scheme page before you apply.
          </p>
        </div>
      </div>
    </footer>
  );
}