import Navbar from "./Navbar";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-border py-5 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="روايتي" className="h-5 w-auto opacity-60" />
          </div>
          <p className="text-xs text-muted-foreground">منصة الكتابة الإبداعية العربية · مدعوم بالذكاء الاصطناعي</p>
        </div>
      </footer>
    </div>
  );
}
