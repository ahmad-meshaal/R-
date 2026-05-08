import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Show, SignInButton } from "@clerk/react";
import { PenLine, Sparkles, Users, ArrowLeft, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/layout/PageLayout";
import NovelCard from "@/components/NovelCard";
import { apiFetch } from "@/lib/api";

export default function HomePage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => apiFetch("/novels/stats") });
  const { data: latestData } = useQuery({ queryKey: ["novels", "latest"], queryFn: () => apiFetch("/novels?sort=latest&limit=6") });
  const { data: trendingData } = useQuery({ queryKey: ["novels", "trending"], queryFn: () => apiFetch("/novels?sort=trending&limit=6") });

  const latest = latestData?.novels ?? [];
  const trending = trendingData?.novels ?? [];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="bg-foreground text-background py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-background/25 px-3 py-1 text-xs font-mono mb-8 tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            مدعوم بالذكاء الاصطناعي
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6">
            اكتب روايتك
            <br />
            <span className="opacity-50">بلا حدود</span>
          </h1>
          <p className="text-base sm:text-lg opacity-70 mb-10 max-w-lg mx-auto leading-relaxed">
            منصة عربية للكتابة الإبداعية — أنشئ روايات مذهلة بمساعدة الذكاء الاصطناعي، وشارك قصصك مع القراء.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="lg" variant="secondary" className="gap-2 border-2 border-background/20">
                  <PenLine className="w-4 h-4" />
                  ابدأ مجاناً
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link href="/my-novels">
                <Button size="lg" variant="secondary" className="gap-2 border-2 border-background/20">
                  <PenLine className="w-4 h-4" />
                  رواياتي
                </Button>
              </Link>
            </Show>
            <Link href="/discover">
              <Button size="lg" variant="ghost" className="gap-2 text-background hover:bg-background/10 hover:text-background">
                <BookOpen className="w-4 h-4" />
                استكشف
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <section className="border-b-2 border-border bg-muted/30">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x-2 divide-border rtl:divide-x-reverse">
            {[
              { label: "رواية", value: stats.totalNovels },
              { label: "كاتب", value: stats.totalAuthors },
              { label: "فصل", value: stats.totalChapters },
              { label: "قراءة", value: stats.totalReads },
            ].map((s, i) => (
              <div key={i} className="py-5 text-center">
                <p className="text-2xl font-bold font-mono">{s.value?.toLocaleString("ar") ?? "0"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-14 px-4 border-b-2 border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-8 text-center text-muted-foreground uppercase tracking-wider text-sm font-mono">كل ما تحتاج للكتابة الاحترافية</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: PenLine, title: "محرر ذكي", desc: "حفظ تلقائي، تنظيم الفصول، كتابة سلسة بدون انقطاع." },
              { icon: Sparkles, title: "الذكاء الاصطناعي", desc: "ولّد هياكل الروايات، أنشئ فصولاً، حسّن نصوصك بضغطة." },
              { icon: Users, title: "مجتمع القراء", desc: "انشر روايتك، تفاعل مع القراء، وابنِ جمهورك." },
            ].map((f, i) => (
              <div key={i} className="brutal-card p-5 bg-card">
                <f.icon className="w-7 h-7 mb-3" />
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="py-10 px-4 border-b-2 border-border">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4" />الأكثر قراءة</h2>
              <Link href="/discover?sort=trending">
                <Button variant="ghost" size="sm" className="gap-1 text-sm"><ArrowLeft className="w-3.5 h-3.5" />الكل</Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((novel: any) => <NovelCard key={novel.id} novel={novel} />)}
            </div>
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4" />أحدث الروايات</h2>
              <Link href="/discover">
                <Button variant="ghost" size="sm" className="gap-1 text-sm"><ArrowLeft className="w-3.5 h-3.5" />الكل</Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latest.map((novel: any) => <NovelCard key={novel.id} novel={novel} />)}
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}
