const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex h-screen flex-col bg-zinc-800 items-center justify-center">
      {children}
    </main>
  );
};

export default AuthLayout;
