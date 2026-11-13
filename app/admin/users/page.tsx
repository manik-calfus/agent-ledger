"use client";

import Gate from "@/components/Gate";
import UserManagement from "@/components/UserManagement";

export default function AdminUsersPage() {
  return (
    <Gate requireAdmin>
      {({ user, profile }) => <UserManagement currentUid={user.uid} profile={profile} />}
    </Gate>
  );
}
