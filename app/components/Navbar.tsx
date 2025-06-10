"use client";

import Image from "next/image";
import Link from "next/link";
import bfriendsLogo from "../../public/logo-name.svg";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Users } from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import SearchCommunity from "./SearchCommunity";
import React, { useState, useEffect, useRef } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface PassedUserData {
  imageUrl: string | null;
  userName: string | null;
}

interface NavbarProps {
  user: SupabaseUser | null;
  userData: PassedUserData | null;
}

const Navbar: React.FC<NavbarProps> = ({ user, userData }) => {
  const lastScrollY = useRef(
    typeof window !== "undefined" ? window.scrollY : 0
  );
  const [showNavbar, setShowNavbar] = useState(true);
  const [isMouseAtTop, setIsMouseAtTop] = useState(false);
  const topHoverThreshold = 50;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY === 0) {
        setShowNavbar(true);
      } else if (currentScrollY < lastScrollY.current) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY.current) {
        if (!isMouseAtTop) {
          setShowNavbar(false);
        }
      }
      lastScrollY.current = currentScrollY;
    };

    if (typeof window !== "undefined") {
      lastScrollY.current = window.scrollY;
      handleScroll();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMouseAtTop]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < topHoverThreshold) {
        if (!isMouseAtTop) setIsMouseAtTop(true);
        setShowNavbar(true);
      } else {
        if (isMouseAtTop) {
          setIsMouseAtTop(false);
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [isMouseAtTop, topHoverThreshold]);

  return (
    <nav
      className={`flex items-center border-b px-5 lg:px-14 justify-between bg-background transition-transform duration-300 ease-in-out h-[10vh] ${
        showNavbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <Link href="/" className="flex items-center">
        <Image src={bfriendsLogo} alt="BFriends Logo" className="h-8 w-fit" />
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
            userName={userData.userName ?? ""}
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
