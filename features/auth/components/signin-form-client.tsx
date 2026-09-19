import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { signIn } from "@/auth";

async function handleGoogleSignIn() {
  "use server";
  await signIn("google");
}

async function handleGithubSignIn() {
  "use server";
  await signIn("github");
}

const SignInFormClient = () => {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-xl backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3">
        <form action={handleGoogleSignIn}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="group w-full justify-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E93F3F]/50 hover:shadow-md"
          >
            <FcGoogle className="mr-2 h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span>Continue with Google</span>
          </Button>
        </form>

        <form action={handleGithubSignIn}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="group w-full justify-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E93F3F]/50 hover:shadow-md"
          >
            <FaGithub className="mr-2 h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span>Continue with GitHub</span>
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Secure OAuth only
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          We never see or store your password.
        </p>
      </CardContent>

      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          By signing in, you agree to our{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignInFormClient;
