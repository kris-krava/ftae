// Takeover routes (edit-email, edit-username, reauthenticate) bypass the
// global Sidebar/MobileNav chrome. Auth check is inherited from the parent
// (authed) layout — this group exists purely to opt out of chrome.
export default function TakeoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
