import type { Metadata } from "next";
import ProfileEditor from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Soldier profile: scoring details and training preferences, stored only in this browser.",
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
