import Link from "next/link";
import Image from "next/image";
import { BookOpen, LayoutGrid } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import UserButton from "../../auth/components/user-button";

export function Header() {
  return (
    <>
      <div className="sticky top-0 left-0 right-0 z-50">
        <div className="bg-white dark:bg-black/5 w-full">
          {/* Rest of the header content */}
          <div className="flex items-center justify-center w-full flex-col">
            <div
              className={`
                            flex items-center justify-between
                            bg-linear-to-b from-white/90 via-gray-50/90 to-white/90
                            dark:from-zinc-900/90 dark:via-zinc-800/90 dark:to-zinc-900/90
                            shadow-[0_2px_20px_-2px_rgba(0,0,0,0.1)]
                            backdrop-blur-md
                            border-x border-b 
                            border-[rgba(230,230,230,0.7)] dark:border-[rgba(70,70,70,0.7)]
                            w-full sm:min-w-[800px] sm:max-w-[1200px]
                            rounded-b-[28px]
                            px-4 py-2.5
                            relative
                            transition-all duration-300 ease-in-out
                        `}
            >
              <div className="relative z-10 flex items-center justify-between w-full gap-2">
                {/* Logo Section with Navigation Links */}
                <div className="flex items-center gap-6 justify-center">
                  <Link
                    href="/"
                    className="flex items-center gap-2 justify-center"
                  >
                    <Image
                      src={"/logo.svg"}
                      alt="Logo"
                      height={60}
                      width={60}
                    />

                    <span className="hidden sm:block font-extrabold text-lg">
                      AeroCode
                    </span>
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  {/* Desktop Navigation Links */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-1.5 rounded-full border border-transparent bg-zinc-100 px-3.5 py-1.5 text-sm font-semibold text-zinc-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E93F3F]/40 hover:text-[#E93F3F] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:text-[#ff6b6b]"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Playgrounds
                    </Link>
                    <Link
                      href="/#guide"
                      className="flex items-center gap-1.5 rounded-full border border-[#E93F3F]/40 bg-[#E93F3F]/10 px-3.5 py-1.5 text-sm font-semibold text-[#E93F3F] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E93F3F] hover:text-white dark:text-[#ff6b6b] dark:hover:text-white"
                    >
                      <BookOpen className="h-4 w-4" />
                      Guide
                    </Link>
                  </div>
                </div>

                {/* Right side items */}
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  {/* <HeaderPro /> */}
                  <ThemeToggle />
                  <UserButton />
                </div>

                {/* Mobile Navigation remains unchanged */}
                <div className="flex sm:hidden items-center gap-2">
                  <Link
                    href="/dashboard"
                    aria-label="Playgrounds"
                    className="flex items-center justify-center rounded-full bg-zinc-100 p-2 text-zinc-800 transition-colors dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/#guide"
                    aria-label="Guide"
                    className="flex items-center justify-center rounded-full border border-[#E93F3F]/40 bg-[#E93F3F]/10 p-2 text-[#E93F3F] transition-colors dark:text-[#ff6b6b]"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Link>
                  <ThemeToggle />
                  <UserButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
