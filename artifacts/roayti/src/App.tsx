import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/home";
import DiscoverPage from "@/pages/discover";
import NovelDetailPage from "@/pages/novel-detail";
import ChapterReadPage from "@/pages/chapter-read";
import MyNovelsPage from "@/pages/my-novels";
import EditorPage from "@/pages/editor";
import LibraryPage from "@/pages/library";
import ProfilePage from "@/pages/profile";
import AiToolsPage from "@/pages/ai-tools";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

// Syncs Clerk profile to our DB on first sign-in
function UserSync() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const syncedRef = useRef(false);
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  useEffect(() => {
    if (!isSignedIn || !user || syncedRef.current) return;
    syncedRef.current = true;
    (async () => {
      try {
        const token = await getToken();
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ")
          || user.username
          || user.primaryEmailAddress?.emailAddress?.split("@")[0]
          || "مستخدم";
        await fetch(`${BASE}/api/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            displayName,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            photoURL: user.imageUrl ?? null,
          }),
        });
      } catch {
        // silent — not critical
      }
    })();
  }, [isSignedIn, user]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ProtectedPage({ component: Page }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in"><Page /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/novels/:novelId" component={NovelDetailPage} />
      <Route path="/novels/:novelId/chapters/:chapterId" component={ChapterReadPage} />
      <Route path="/my-novels" component={() => <ProtectedPage component={MyNovelsPage} />} />
      <Route path="/editor/:novelId" component={() => <ProtectedPage component={EditorPage} />} />
      <Route path="/editor/:novelId/chapters/:chapterId" component={() => <ProtectedPage component={EditorPage} />} />
      <Route path="/library" component={() => <ProtectedPage component={LibraryPage} />} />
      <Route path="/ai-tools" component={() => <ProtectedPage component={AiToolsPage} />} />
      <Route path="/profile/:userId" component={ProfilePage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      appearance={{
        cssLayerName: "clerk",
        variables: {
          colorPrimary: "hsl(0, 0%, 5%)",
          colorForeground: "hsl(0, 0%, 5%)",
          colorMutedForeground: "hsl(0, 0%, 45%)",
          colorDanger: "hsl(0, 72%, 51%)",
          colorBackground: "hsl(0, 0%, 100%)",
          colorInput: "hsl(0, 0%, 98%)",
          colorInputForeground: "hsl(0, 0%, 5%)",
          colorNeutral: "hsl(0, 0%, 85%)",
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          borderRadius: "0px",
        },
        options: {
          logoPlacement: "inside",
          logoLinkUrl: basePath || "/",
          logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
        },
        elements: {
          rootBox: "w-full flex justify-center",
          cardBox: "border-2 border-[hsl(0,0%,85%)] w-[440px] max-w-full overflow-hidden bg-white",
          card: "!shadow-none !border-0 !bg-transparent",
          footer: "!shadow-none !border-0 !bg-transparent",
          headerTitle: "text-foreground font-bold",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButtonText: "text-foreground",
          formFieldLabel: "text-foreground font-medium",
          footerActionLink: "text-foreground font-medium underline",
          footerActionText: "text-muted-foreground",
          dividerText: "text-muted-foreground",
          identityPreviewEditButton: "text-foreground",
          formFieldSuccessText: "text-green-700",
          alertText: "text-foreground",
          formButtonPrimary: "bg-[hsl(0,0%,5%)] text-white border-2 border-[hsl(0,0%,5%)] hover:opacity-90",
          formFieldInput: "border-2 border-[hsl(0,0%,85%)] bg-white text-foreground",
        },
      }}
      localization={{
        signIn: { start: { title: "مرحباً بعودتك", subtitle: "سجّل دخولك للمتابعة" } },
        signUp: { start: { title: "أنشئ حسابك", subtitle: "ابدأ رحلتك الإبداعية" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryCacheInvalidator />
        <UserSync />
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
