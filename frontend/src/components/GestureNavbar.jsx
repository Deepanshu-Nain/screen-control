"use client";
import {
  Navbar,
  NavBody,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState } from "react";

/**
 * GestureNavbar — DOSS-style dark navbar for the ADHD gesture control app.
 *
 * Layout: [ADHD logo]  ...  [Cursor Control]  [gap]  [Hand Gesture Control]  ...  [Active/Inactive toggle]
 */
export default function GestureNavbar({ isActive, appMode, onToggleActive, onToggleMode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          {/* Left — Logo */}
          <NavbarLogo />

          {/* Center — two main controls with big gap */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-16 pointer-events-auto">
              <NavbarButton
                variant={appMode === "mouse" ? "dark" : "secondary"}
                onClick={() => { if (appMode !== "mouse") onToggleMode(); }}
                as="button"
              >
                Cursor Control
              </NavbarButton>
              <NavbarButton
                variant={appMode === "gesture" ? "dark" : "secondary"}
                onClick={() => { if (appMode !== "gesture") onToggleMode(); }}
                as="button"
              >
                Hand Gesture Control
              </NavbarButton>
            </div>
          </div>

          {/* Right — Active/Inactive toggle */}
          <NavbarButton
            variant={isActive ? "primary" : "dark"}
            onClick={onToggleActive}
            as="button"
          >
            {isActive ? "Active" : "Inactive"}
          </NavbarButton>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (appMode !== "mouse") onToggleMode();
                setIsMobileMenuOpen(false);
              }}
              className="relative text-[16px] text-neutral-400 hover:text-white transition-colors"
            >
              Cursor Control
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (appMode !== "gesture") onToggleMode();
                setIsMobileMenuOpen(false);
              }}
              className="relative text-[16px] text-neutral-400 hover:text-white transition-colors"
            >
              Hand Gesture Control
            </a>
            <div className="flex w-full flex-col gap-3 pt-2">
              <NavbarButton
                onClick={() => {
                  onToggleActive();
                  setIsMobileMenuOpen(false);
                }}
                variant={isActive ? "primary" : "dark"}
                className="w-full"
                as="button"
              >
                {isActive ? "Active" : "Inactive"}
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
