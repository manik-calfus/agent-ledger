"use client";

import Gate from "@/components/Gate";
import Ledger from "@/components/Ledger";

export default function Page() {
  return <Gate>{({ user, profile }) => <Ledger user={user} profile={profile} />}</Gate>;
}
