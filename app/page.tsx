import { Button } from "@/components/ui/button";
import UserButton from "@/features/auth/components/user-button";

export default function Home() {
  return (
    <div className="bg-gray-500 text-2xl">
      Hi this is ayush
      <UserButton />
    </div>
  );
}
