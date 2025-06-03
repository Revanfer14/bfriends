"use client";

import Image from "next/image";
import Link from "next/link";
import bfriendsLogo from "../../public/logo-name.svg";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Users } from 'lucide-react';
import { UserDropdown } from "./UserDropdown";
import SearchCommunity from "./SearchCommunity";
import React, { useState, useEffect, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Define UserData based on what getUserData returns and Navbar needs
interface PassedUserData {
  imageUrl: string | null;
  userName: string | null;
  // Add other fields if getUserData returns more and they are used by UserDropdown
}

interface NavbarProps {
  user: SupabaseUser | null;
  userData: PassedUserData | null;
}

const Navbar: React.FC<NavbarProps> = ({ user, userData }) => {
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const [showNavbar, setShowNavbar] = useState(true);
  const [isMouseAtTop, setIsMouseAtTop] = useState(false);
  const topHoverThreshold = 50; // pixels to consider as 'top edge' for hover

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY === 0) {
        setShowNavbar(true);
      } else if (currentScrollY < lastScrollY.current) { // Scrolling UP
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY.current) { // Scrolling DOWN
        // Only hide if mouse is not in the hover-reveal zone
        if (!isMouseAtTop) {
          setShowNavbar(false);
        }
        // If isMouseAtTop is true, navbar remains visible even if scrolling down
      }
      lastScrollY.current = currentScrollY;
    };

    // Initialize lastScrollY on mount and call handleScroll for initial state
    if (typeof window !== 'undefined') {
        lastScrollY.current = window.scrollY;
        handleScroll(); // Set initial state based on load scroll position & mouse
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMouseAtTop]); // Re-run if isMouseAtTop changes, as it affects visibility logic

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < topHoverThreshold) {
        if (!isMouseAtTop) setIsMouseAtTop(true);
        // Hovering at the top should always attempt to show the navbar
        // This ensures that if it was hidden by scroll-down, hover can override.
        setShowNavbar(true); 
      } else {
        if (isMouseAtTop) {
          setIsMouseAtTop(false);
          // When mouse leaves the top hover zone, the scroll handler's logic
          // will determine if the navbar should hide (if scrolling down and not at top).
          // No need to explicitly setShowNavbar(false) here, as it might conflict
          // if the user is scrolling up and mouse just left the top zone.
          // The scroll handler (which depends on isMouseAtTop) will correctly update.
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isMouseAtTop, topHoverThreshold]); // Depend on isMouseAtTop to use its current value

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 flex items-center border-b px-5 lg:px-14 justify-between bg-background transition-transform duration-300 ease-in-out h-[10vh] ${
        showNavbar ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <Link href="/" className="flex items-center">
        <Image
          src={bfriendsLogo}
          alt="BFriends Logo"
          className="h-8 w-fit"
        />
      </Link>

      <SearchCommunity />

      <div className="flex items-center gap-x-4">
        {user && (
          <Button variant="ghost" asChild>
            <Link href="/find-friends" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Find Friends
            </Link>
          </Button>
        )}
        <ThemeToggle />
        {user && userData ? (
          <UserDropdown
            userImage={userData.imageUrl}
            userName={userData.userName ?? ""} // Ensure userName is not null for UserDropdown if it expects string
          />
        ) : (
          <div className="flex items-center gap-x-4">
            <Button variant={"secondary"} asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

