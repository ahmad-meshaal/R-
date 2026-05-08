import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, BookOpen, Edit2, Check, X, Camera } from "lucide-react";
import { useAuth, useUser, Show, SignInButton } from "@clerk/react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageLayout from "@/components/layout/PageLayout";
import NovelCard from "@/components/NovelCard";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function EditableField({
  value, onSave, multiline = false, placeholder,
}: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-right group flex items-start gap-2 hover:opacity-80 transition-opacity w-full">
        <span className={cn(!value && "text-muted-foreground italic")}>{value || placeholder}</span>
        <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 mt-0.5 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-start w-full">
      {multiline ? (
        <Textarea value={draft} onChange={e => setDraft(e.target.value)}
          className="border-2 resize-none text-sm flex-1" rows={3} autoFocus
          placeholder={placeholder} />
      ) : (
        <Input value={draft} onChange={e => setDraft(e.target.value)}
          className="border-2 flex-1" autoFocus placeholder={placeholder} />
      )}
      <div className="flex flex-col gap-1">
        <Button size="icon" className="h-7 w-7 border-2" onClick={commit}><Check className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 border-2" onClick={cancel}><X className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { isSignedIn, userId: currentClerkId } = useAuth();
  const { user: clerkUser } = useUser();
  const { call } = useApi();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"novels" | "about">("novels");
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwn = currentClerkId === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => apiFetch(`/auth/users/${userId}`),
  });

  const updateMutation = useMutation({
    mutationFn: (fields: { displayName?: string; bio?: string; photoURL?: string }) =>
      call("/auth/me", { method: "PUT", body: JSON.stringify(fields) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast({ title: "تم الحفظ" });
    },
    onError: () => toast({ title: "فشل الحفظ", variant: "destructive" }),
  });

  const followMutation = useMutation({
    mutationFn: () => profile?.isFollowing
      ? call(`/follows/${userId}`, { method: "DELETE" })
      : call(`/follows/${userId}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateMutation.mutate({ photoURL: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="h-40 bg-muted animate-pulse border-2 border-border" />
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return <PageLayout><div className="text-center py-20 text-muted-foreground">المستخدم غير موجود</div></PageLayout>;
  }

  const photoUrl = profile.photoURL || clerkUser?.imageUrl;

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="brutal-card bg-card p-6 mb-6">
          <div className="flex gap-5 items-start flex-col sm:flex-row">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-border overflow-hidden bg-muted flex items-center justify-center text-3xl font-bold">
                {photoUrl
                  ? <img src={photoUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                  : <span>{profile.displayName?.[0] ?? "؟"}</span>
                }
              </div>
              {isOwn && (
                <>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 left-0 bg-foreground text-background w-7 h-7 flex items-center justify-center border-2 border-background hover:opacity-80 transition-opacity">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </>
              )}
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0 w-full">
              {/* Display name */}
              <div className="text-xl font-bold mb-1">
                {isOwn
                  ? <EditableField value={profile.displayName ?? ""} placeholder="اسمك هنا"
                      onSave={v => updateMutation.mutate({ displayName: v })} />
                  : <span>{profile.displayName}</span>
                }
              </div>

              {/* Bio */}
              <div className="text-sm text-muted-foreground mb-3">
                {isOwn
                  ? <EditableField value={profile.bio ?? ""} placeholder="أضف نبذة عنك..." multiline
                      onSave={v => updateMutation.mutate({ bio: v })} />
                  : <span>{profile.bio || <span className="italic">لا توجد نبذة</span>}</span>
                }
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5 text-sm mb-4">
                <div className="text-center">
                  <p className="font-bold font-mono">{profile.followersCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">متابع</p>
                </div>
                <div className="text-center">
                  <p className="font-bold font-mono">{profile.followingCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">يتابع</p>
                </div>
                <div className="text-center">
                  <p className="font-bold font-mono">{profile.novelsCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">رواية</p>
                </div>
              </div>

              {/* Follow / own actions */}
              {isOwn ? (
                <p className="text-xs text-muted-foreground border border-border px-2 py-1 inline-block font-mono">
                  انقر على اسمك أو نبذتك للتعديل
                </p>
              ) : (
                <>
                  <Show when="signed-in">
                    <Button onClick={() => followMutation.mutate()} disabled={followMutation.isPending} size="sm"
                      variant={profile.isFollowing ? "outline" : "default"} className="border-2 gap-2">
                      <Users className="w-4 h-4" />
                      {profile.isFollowing ? "إلغاء المتابعة" : "متابعة"}
                    </Button>
                  </Show>
                  <Show when="signed-out">
                    <SignInButton mode="modal">
                      <Button variant="outline" size="sm" className="border-2 gap-2"><Users className="w-4 h-4" />متابعة</Button>
                    </SignInButton>
                  </Show>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-border mb-6">
          {[
            { id: "novels" as const, label: `الروايات (${profile.novels?.length ?? 0})` },
            { id: "about" as const, label: "عن الكاتب" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("px-5 py-2.5 text-sm font-medium border-b-2 -mb-0.5 transition-colors",
                activeTab === tab.id ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "novels" && (
          <>
            {!profile.novels?.length ? (
              <div className="text-center py-16 border-2 border-dashed border-border">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">لا توجد روايات منشورة بعد</p>
                {isOwn && (
                  <Link href="/my-novels">
                    <Button size="sm" className="mt-4 border-2">ابدأ الكتابة</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {profile.novels.map((novel: any) => <NovelCard key={novel.id} novel={novel} />)}
              </div>
            )}
          </>
        )}

        {activeTab === "about" && (
          <div className="brutal-card bg-card p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">الاسم</p>
              <p className="font-medium">{profile.displayName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">النبذة</p>
              <p className="text-sm leading-relaxed">{profile.bio || "لم يضف الكاتب نبذة عنه بعد."}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">الروايات المنشورة</p>
              <p className="font-medium font-mono">{profile.novelsCount ?? 0}</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
