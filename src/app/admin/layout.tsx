export const metadata = {
  title: 'Admin - Zeus Dashboard',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {children}
    </div>
  );
}
