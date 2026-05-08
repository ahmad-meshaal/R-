import { Link, useLocation } from "wouter";
import { Show, SignInButton, useUser } from "@clerk/react";
import { Compass, PenLine, Library, Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/discover", label: "اكتشف", icon: Compass },
  { href: "/my-novels", label: "رواياتي", icon: PenLine, auth: true },
  { href: "/library", label: "مكتبتي", icon: Library, auth: true },
  { href: "/ai-tools", label: "ذكاء اصطناعي", icon: Sparkles, auth: true },
];

function Avatar({ compact }: { compact?: boolean }) {
  const { user } = useUser();
  const initials = user?.firstName?.[0] ?? user?.username?.[0] ?? "؟";
  return (
    <Link href={`/profile/${user?.id}`}>
      <div className={cn(
        "border-2 border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-foreground transition-colors flex-shrink-0",
        compact ? "w-8 h-8 text-sm" : "w-9 h-9 text-base"
      )}>
        {user?.imageUrl
          ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
          : <span className="font-bold">{initials}</span>
        }
      </div>
    </Link>
  );
}

export default function Navbar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="روايتي" className="h-7 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          {navLinks.map(({ href, label, auth }) =>
            auth ? (
              <Show key={href} when="signed-in">
                <Link href={href}>
                  <Button variant="ghost" size="sm" className={cn("text-sm", location === href && "bg-accent font-medium")}>
                    {label}
                  </Button>
                </Link>
              </Show>
            ) : (
              <Link key={href} href={href}>
                <Button variant="ghost" size="sm" className={cn("text-sm", location === href && "bg-accent font-medium")}>
                  {label}
                </Button>
              </Link>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm" className="border-2 text-sm hidden sm:flex">دخول</Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Avatar />
          </Show>
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t-2 border-border bg-background px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon, auth }) =>
            auth ? (
              <Show key={href} when="signed-in">
                <Link href={href} onClick={() => setOpen(false)}>
                  <div className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", location === href && "bg-accent font-medium")}>
                    <Icon className="w-4 h-4" />{label}
                  </div>
                </Link>
              </Show>
            ) : (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                <div className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", location === href && "bg-accent font-medium")}>
                  <Icon className="w-4 h-4" />{label}
                </div>
              </Link>
            )
          )}
          <Show when="signed-out">
            <div className="pt-2 border-t border-border mt-2">
              <SignInButton mode="modal">
                <Button size="sm" className="w-full border-2">تسجيل الدخول</Button>
              </SignInButton>
            </div>
          </Show>
        </div>
      )}
    </nav>
  );
}
