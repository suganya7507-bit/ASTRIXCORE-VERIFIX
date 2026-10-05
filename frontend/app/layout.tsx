import './globals.css';
import { Sidebar } from './components/Sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-950 antialiased font-sans selection:bg-amber-300 selection:text-amber-950">
        {/* Shiny Mirror Medium-Gold Canvas */}
        <div className="flex min-h-screen bg-gradient-to-br from-[#E2BA4B] via-[#FCE38A] via-[#E6BF52] to-[#CCA22D]">
          
          <Sidebar />

          {/* Main Workspace with Mirror Specular Sheen Reflections */}
          <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-[#FDF0BE]/90 via-[#F7DA7B]/85 to-[#E1B743]/90 backdrop-blur-sm relative shadow-[inset_0_0_100px_rgba(255,255,255,0.4)]">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}