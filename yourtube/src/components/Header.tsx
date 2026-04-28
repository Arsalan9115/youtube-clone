import { Bell, Menu, Mic, PhoneCall, Search, User, VideoIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import AuthDialog from "./AuthDialog";

const Header = () => {
  const { user, logout } = useUser();
  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const openSignInDialog = () => setIsAuthDialogOpen(true);

    window.addEventListener("yourtube:open-auth", openSignInDialog);
    return () => window.removeEventListener("yourtube:open-auth", openSignInDialog);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };
  return (
    <header className="border-b bg-background px-3 py-3 md:px-4">
      <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:justify-between">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex">
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex min-w-0 items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="truncate text-lg font-medium md:text-xl">YourTube</span>
          <span className="ml-1 hidden text-xs text-gray-400 sm:inline">IN</span>
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="order-3 flex w-full items-center gap-2 md:order-none md:mx-4 md:max-w-2xl md:flex-1"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hidden rounded-full md:inline-flex"
        >
          <Mic className="w-5 h-5" />
        </Button>
      </form>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {user ? (
          <>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <VideoIcon className="w-6 h-6" />
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/connect" className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5" />
                <span className="hidden lg:inline">Connect</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Bell className="w-6 h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsAuthDialogOpen(true)}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          </>
        )}{" "}
      </div>
      </div>
      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      />
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </header>
  );
};

export default Header;
