"use client";

import Gate from "@/components/Gate";
import Insights from "@/components/Insights";

export default function InsightsPage() {
  return <Gate>{({ profile }) => <Insights profile={profile} />}</Gate>;
}
