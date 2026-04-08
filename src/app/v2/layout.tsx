export const metadata = {
  title: 'Zeus Admin',
};

export default function AdminV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07080D] text-white">
      {children}
    </div>
  );
}
