import AppShell from "@/components/AppShell";
import AutoCalendarSync from "@/components/AutoCalendarSync";
import CalendarSyncToast from "@/components/CalendarSyncToast";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <><AutoCalendarSync/><CalendarSyncToast/><AppShell>{children}</AppShell></>;
}
