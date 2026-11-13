"use client";

import { useParams } from "next/navigation";
import Gate from "@/components/Gate";
import IdeaDetail from "@/components/IdeaDetail";

export default function IdeaPage() {
  const params = useParams<{ id: string }>();
  return (
    <Gate>
      {({ user, profile }) => <IdeaDetail id={params.id} user={user} profile={profile} />}
    </Gate>
  );
}
