"use client";

import Gate from "@/components/Gate";
import Settings from "@/components/Settings";

export default function SettingsPage() {
  return <Gate>{({ user, profile }) => <Settings user={user} profile={profile} />}</Gate>;
}
