import React from "react";
import Image from "next/image";
import SignInFormClient from "@/features/auth/components/signin-form-client";

const SignInPage = () => {
  return (
    <>
      <Image src="/logo.svg" alt="Logo Image" width={300} height={300} />
      <SignInFormClient />
    </>
  );
};

export default SignInPage;
