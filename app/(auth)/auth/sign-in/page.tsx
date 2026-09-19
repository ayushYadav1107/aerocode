import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Bot, Play, Terminal } from "lucide-react";
import SignInFormClient from "@/features/auth/components/signin-form-client";

const features = [
  {
    icon: Bot,
    title: "AI pair programmer",
    description: "Inline suggestions and a chat that reads your open file.",
  },
  {
    icon: Play,
    title: "Runs in your browser",
    description: "WebContainers boot your project with no local setup.",
  },
  {
    icon: Terminal,
    title: "A real terminal",
    description: "Install packages and run dev servers right in the tab.",
  },
];

const SignInPage = () => {
  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-10 lg:flex-row lg:justify-between lg:gap-16">
      <section className="aero-rise flex max-w-md flex-col items-center text-center lg:items-start lg:text-left">
        <Image
          src="/logo.svg"
          alt="Aerocode"
          width={120}
          height={120}
          priority
          className="drop-shadow-lg"
        />

        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Code anything,{" "}
          <span className="text-[#E93F3F]">anywhere</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          A full development environment in your browser, with an AI assistant
          that actually knows what you are working on.
        </p>

        <ul className="mt-8 grid w-full gap-4">
          {features.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="aero-rise flex items-start gap-3 text-left"
              style={{ animationDelay: `${150 + index * 110}ms` }}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-[#E93F3F]">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div
        className="aero-rise w-full max-w-md"
        style={{ animationDelay: "220ms" }}
      >
        <SignInFormClient />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          New here? Signing in creates your account automatically.{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
