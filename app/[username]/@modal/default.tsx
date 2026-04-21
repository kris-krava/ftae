// No-op for the @modal parallel slot. Next.js requires a default.tsx so that
// when no intercepting route matches, the slot renders nothing instead of
// throwing "not found".
export default function ModalDefault() {
  return null;
}
