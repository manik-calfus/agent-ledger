"use client";

import Gate from "@/components/Gate";
import MyIdeas from "@/components/MyIdeas";

export default function MyIdeasPage() {
  return <Gate>{({ user, profile }) => <MyIdeas user={user} profile={profile} />}</Gate>;
}
