import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SettingsForm from "@/features/dashboard/components/settings-form";
import { currentUser } from "@/features/auth/actions";

const SettingsPage = async () => {
  const user = await currentUser();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Preferences for your account and editor.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-medium">Account</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Signed in with your connected provider.
          </p>

          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
              <AvatarFallback>
                {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user?.name ?? "Unnamed user"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email ?? "No email on file"}
              </p>
            </div>
          </div>
        </section>

        <SettingsForm />
      </div>
    </div>
  );
};

export default SettingsPage;
