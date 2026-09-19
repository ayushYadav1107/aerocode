const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* animated backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="aero-orb absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#E93F3F]/20 blur-3xl" />
        <div
          className="aero-orb absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-orange-500/15 blur-3xl"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="aero-orb absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl"
          style={{ animationDelay: "-9s" }}
        />
      </div>

      {children}
    </main>
  );
};

export default AuthLayout;
