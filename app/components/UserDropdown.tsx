"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuIcon, UserCircle, Settings, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "../actions";
import { useTransition } from "react";

interface AppProps {
  userImage: string | null;
  userName: string | null;
}

export function UserDropdown({ userImage, userName }: AppProps) {
  const [isPending, startTransition] = useTransition();
  const defaultImage = "/default.png";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="rounded-xl border px-2 py-2 lg:px-4 lg:py-2 flex items-center gap-x-3 cursor-pointer outline-none focus-visible:ring-0">
          <MenuIcon className="w-6 h-6 lg:w-5 lg:h-5" />

          <div className="relative h-8 w-8 hidden lg:block">
            <Image
              src={userImage || defaultImage}
              alt={`${userName}'s profile`}
              fill
              className="rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = defaultImage;
              }}
            />
          </div>

          <h1 className="font-semibold">{userName ?? ""}</h1>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[233px]">
        <DropdownMenuItem>
          <Link className="w-full" href="/p/create">
            Create Community
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link className="w-full" href="/p/binus/create">
            Create Post
          </Link>
        </DropdownMenuItem>
        {userName && (
          <DropdownMenuItem>
            <Link
              className="w-full flex items-center"
              href={`/profile/${userName}`}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              My Profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <Link className="w-full flex items-center" href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            startTransition(async () => {
              await logoutAction();
            });
          }}
          disabled={isPending}
          className="cursor-pointer"
        >
          {isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
