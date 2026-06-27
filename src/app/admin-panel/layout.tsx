export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="retro-page retro-admin">{children}</div>;
}
