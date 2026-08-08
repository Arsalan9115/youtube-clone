import Link from "next/link";
import { useRouter } from "next/router";
import { Compass, Download, Home, PhoneCall, ThumbsUp } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/connect", label: "Connect", icon: PhoneCall },
  { href: "/downloads", label: "Downloads", icon: Download },
  { href: "/liked", label: "Liked", icon: ThumbsUp },
];

export default function MobileNav() {
  const router = useRouter();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-background/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = router.pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-3 text-[11px] font-medium ${
                isActive ? "text-red-600" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
