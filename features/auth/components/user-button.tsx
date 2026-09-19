"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {LogOut, User} from "lucide-react";
import LogoutButton from "./logout-button";
import { useCurrentUser } from "../hooks/use-current-user";
import { Button } from "@/components/ui/button";
import Link from "next/link";


const UserButton = () => {

  const user = useCurrentUser()

  // the landing page is public, so there may be no session here
  if (!user) {
    return (
      <Button asChild size="sm" variant="brand">
        <Link href="/auth/sign-in">Sign in</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className={cn("relative rounded-full")}>
          <Avatar>
            <AvatarImage src={user?.image!} alt={user?.name!} />
            <AvatarFallback className="bg-red-500">
              <User className="text-white" />
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-64 mr-4">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={user?.image!} alt={user?.name!} />
          <AvatarFallback className="bg-red-500">
            <User className="h-4 w-4 text-white" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {user?.name && (
            <p className="truncate text-sm font-medium">{user.name}</p>
          )}
          <p className="truncate text-xs text-muted-foreground" title={user?.email ?? ""}>
            {user?.email}
          </p>
        </div>
      </div>
      <DropdownMenuSeparator/>
        <LogoutButton>
            <DropdownMenuItem>
                <LogOut className="h-4 w-4 mr-2"/>
                LogOut
            </DropdownMenuItem>
        </LogoutButton>
    </DropdownMenuContent>

    </DropdownMenu>
  );
};

export default UserButton;