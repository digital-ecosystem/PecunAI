"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, LayoutDashboard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface MeUser {
  name?:  string | null;
  email?: string | null;
}

/** The in-session header's profile button, with the menu behind it.
 *
 *  Owns the button, the popover, its own identity fetch and its own actions, so each of the four
 *  phase headers swaps one <motion.button> for one <VoiceProfileMenu /> — nothing has to be threaded
 *  through their props. Before this the icon had whileTap but no onClick in any header, so it
 *  depressed under the finger and did nothing.
 *  See private-documents/after-demo/TEAM_REVIEW_FIXES_PLAN.md. */
export default function VoiceProfileMenu() {
  const router = useRouter();
  const [open,        setOpen]        = useState(false);
  const [user,        setUser]        = useState<MeUser | null>(null);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetched on first open, not on mount: four headers exist but only one is ever on screen, and a
  // menu nobody opens should cost nothing.
  useEffect(() => {
    if (!open || user) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.success) setUser(d.user); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, user]);

  // Dismiss on outside tap / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res  = await fetch("/api/auth/logout", { method: "POST" });
      const json = await res.json();
      if (json?.success) { router.push("/customer/signin"); return; }
    } catch {}
    // Same destination either way — the cookie is httpOnly, so if the server didn't clear it
    // there is nothing useful the client can do beyond getting the customer to the sign-in page.
    setLoggingOut(false);
    router.push("/customer/signin");
  };

  const itemStyle = "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors";

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <motion.button
        className="flex items-center justify-center rounded-full"
        style={{
          width:          44,
          height:         44,
          background:     open ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.6)",
          backdropFilter: "blur(10px)",
          border:         open ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.5)",
          boxShadow:      "0 2px 8px rgba(0,0,0,0.04)",
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil"
      >
        <User size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 rounded-2xl overflow-hidden z-[70]"
            style={{
              top:            52,
              minWidth:       232,
              background:     "rgba(255,255,255,0.97)",
              backdropFilter: "blur(20px)",
              border:         "1px solid rgba(255,255,255,0.6)",
              boxShadow:      "0 12px 40px rgba(15,23,42,0.16), 0 2px 8px rgba(0,0,0,0.06)",
            }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            role="menu"
          >
            <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
              {user ? (
                <>
                  {user.name && (
                    <p className="text-sm font-semibold truncate" style={{ color: "rgba(15,23,42,0.9)" }}>
                      {user.name}
                    </p>
                  )}
                  <p className="text-xs truncate" style={{ color: "rgba(100,116,139,0.9)" }}>
                    {user.email ?? ""}
                  </p>
                </>
              ) : (
                /* Placeholder rows keep the popover from resizing when the fetch lands */
                <>
                  <div className="h-4 w-28 rounded animate-pulse mb-1.5" style={{ background: "rgba(15,23,42,0.07)" }} />
                  <div className="h-3 w-40 rounded animate-pulse" style={{ background: "rgba(15,23,42,0.05)" }} />
                </>
              )}
            </div>

            <button
              className={`${itemStyle} hover:bg-blue-50`}
              style={{ color: "rgba(15,23,42,0.85)" }}
              onClick={() => { setOpen(false); router.push("/customer/dashboard"); }}
              role="menuitem"
            >
              <LayoutDashboard size={16} style={{ color: "rgba(59,130,246,0.8)" }} />
              Zum Dashboard
            </button>

            <button
              className={`${itemStyle} hover:bg-red-50`}
              style={{ color: "rgba(190,18,60,0.9)", opacity: loggingOut ? 0.6 : 1 }}
              onClick={handleLogout}
              disabled={loggingOut}
              role="menuitem"
            >
              <LogOut size={16} style={{ color: "rgba(190,18,60,0.8)" }} />
              {loggingOut ? "Wird abgemeldet …" : "Abmelden"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
