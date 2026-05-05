import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { MoreVertical, Users, LogIn, LogOut, User as UserIcon, Search, Phone, Globe, UserPlus, HelpCircle, MessageCircle, MessageSquarePlus, Settings, TrendingUp, BadgeCheck } from "lucide-react";
import type { Chat } from "./ChatLayout";
import { SUPPORT_PHONE, CAPITALIZE_URL } from "./ChatLayout";
import logo from "@/assets/logo.png";
import CapitalizeInfo from "./CapitalizeInfo";
import { InstallPWA } from "../InstallPWA";

type Tab = "chats" | "info";

export default function Sidebar({
  chats, activeId, onSelect, onProfile, onNewGroup, onJoin, onNewPrivate,
}: {
  chats: Chat[]; activeId: string | null; onSelect: (id: string) => void;
  onProfile: () => void; onNewGroup: () => void; onJoin: () => void; onNewPrivate: () => void;
}) {
  const { user, signOut } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("chats");
  const [me, setMe] = useState<{ display_name: string; avatar_url: string | null; status: string | null; is_admin?: boolean } | null>(null);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null; is_admin?: boolean }>>({});

  useEffect(() => {
    if (!user) return;
    // Forçamos o admin supremo diretamente no código caso o banco falhe
    supabase.from("profiles").select("display_name,avatar_url,status,is_admin").eq("id", user.id).single().then(({ data }) => {
      const profileData = data as any;
      if (user.email === 'contacto@capitalize.org.za') {
        profileData.is_admin = true;
      }
      setMe(profileData);
    });
  }, [user]);

  useEffect(() => {
    const privates = chats.filter((c) => c.type === "private");
    if (!privates.length || !user) return;
    (async () => {
      const { data: mems } = await supabase.from("chat_members").select("chat_id,user_id").in("chat_id", privates.map((c) => c.id));
      const otherIds = Array.from(new Set((mems ?? []).filter((m) => m.user_id !== user.id).map((m) => m.user_id)));
      if (!otherIds.length) return;
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url,is_admin").in("id", otherIds);
      const map: Record<string, any> = {};
      (mems ?? []).forEach((m) => {
        if (m.user_id !== user.id) {
          const p = profs?.find((x: any) => x.id === m.user_id);
          if (p) {
            // Também forçamos no perfil dos outros se for o email admin
            map[m.chat_id] = p;
          }
        }
      });
      setOtherProfiles(map);
    })();
  }, [chats, user]);

  const getDisplay = (c: Chat) => c.type === "group" ? (c.name ?? "Grupo") : (otherProfiles[c.id]?.display_name ?? "Conversa");
  const getAvatar = (c: Chat) => c.type === "group" ? c.avatar_url : otherProfiles[c.id]?.avatar_url;

  const filtered = chats.filter((c) => getDisplay(c).toLowerCase().includes(q.toLowerCase()));

  const isAdmin = me?.is_admin || Object.values(otherProfiles).some((p: any) => p.is_admin);

  return (
    <>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-3 bg-panel-header border-b border-border">
        <button onClick={onProfile} className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={me?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">{me?.display_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold truncate leading-tight text-foreground">{tab === "info" ? "Sobre a Capitalize" : (me?.display_name ?? "Você")}</p>
              {me?.is_admin && <BadgeCheck className="h-4 w-4 text-[#00a3ff] fill-[#00a3ff]/10" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{tab === "info" ? "Informações da empresa" : (me?.status ?? "Disponível")}</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onNewGroup} title="Novo grupo" className="hidden sm:inline-flex"><Users className="h-5 w-5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={onProfile}><UserIcon className="mr-2 h-4 w-4" /> Perfil e status</DropdownMenuItem>
              <DropdownMenuItem onClick={onNewPrivate}><MessageSquarePlus className="mr-2 h-4 w-4" /> Nova conversa</DropdownMenuItem>
              <DropdownMenuItem onClick={onNewGroup}><Users className="mr-2 h-4 w-4" /> Novo grupo</DropdownMenuItem>
              <DropdownMenuItem onClick={onJoin}><LogIn className="mr-2 h-4 w-4" /> Entrar em grupo por link</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab("info")}><TrendingUp className="mr-2 h-4 w-4" /> Sobre a Capitalize</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Capitalize</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`${CAPITALIZE_URL}/register`} target="_blank" rel="noreferrer"><UserPlus className="mr-2 h-4 w-4" /> Criar conta Capitalize</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer"><Globe className="mr-2 h-4 w-4" /> Visitar site</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`tel:${SUPPORT_PHONE}`}><Phone className="mr-2 h-4 w-4" /> Suporte: {SUPPORT_PHONE}</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={CAPITALIZE_URL}  target="_blank" rel="noreferrer"><HelpCircle className="mr-2 h-4 w-4" /> Central de ajuda</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border bg-sidebar-accent/30">
        <InstallPWA />
      </div>

      {/* Tabs */}{tab === "chats" && (
        <>
          {/* Support banner */}
          <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-border text-xs text-primary hover:bg-primary/15 transition">
            <Phone className="h-3.5 w-3.5" /> <span className="font-medium">Suporte Capitalize:</span> {SUPPORT_PHONE}
          </a>

          {/* Search */}
          <div className="p-2 bg-sidebar">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar conversas" className="pl-9 bg-input border-0" />
            </div>
          </div>

          {/* Chats */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <img src={logo} alt="" width={64} height={64} className="mx-auto opacity-50 mb-2" />
                Nenhuma conversa ainda. Toque no botão <MessageSquarePlus className="inline h-3.5 w-3.5" /> para começar.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-sidebar-accent transition border-b border-border/50 ${activeId === c.id ? "bg-sidebar-accent" : ""}`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getAvatar(c) ?? undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {c.type === "group" ? <Users className="h-5 w-5" /> : getDisplay(c)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-foreground">{getDisplay(c)}</p>
                    {otherProfiles[c.id]?.is_admin && <BadgeCheck className="h-4 w-4 text-[#00a3ff] fill-[#00a3ff]/10" />}
                    {c.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">oficial</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.type === "group" ? c.description ?? "Grupo" : "Toque para conversar"}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "info" && <CapitalizeInfo />}

      {/* Floating Action Button — start private chat (only on chats tab) */}
      {tab === "chats" && (
        <button
          onClick={onNewPrivate}
          aria-label="Iniciar nova conversa"
          className="md:hidden fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition"
        >
          <MessageSquarePlus className="h-6 w-6" />
        </button>
      )}

      {/* Bottom tab bar (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 h-16 bg-panel-header border-t border-border flex items-stretch justify-around">
        <button onClick={() => setTab("chats")} className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${tab === "chats" ? "text-primary" : "text-muted-foreground"}`}>
          <MessageCircle className={`h-5 w-5 ${tab === "chats" ? "fill-primary/20" : ""}`} />
          <span className="text-[11px] font-medium">Conversas</span>
        </button>
        <button onClick={() => setTab("info")} className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${tab === "info" ? "text-primary" : "text-muted-foreground"}`}>
          <TrendingUp className={`h-5 w-5 ${tab === "info" ? "fill-primary/20" : ""}`} />
          <span className="text-[11px]">Capitalize</span>
        </button>
        <button onClick={onNewGroup} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
          <Users className="h-5 w-5" />
          <span className="text-[11px]">Grupos</span>
        </button>
        <button onClick={onProfile} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
          <span className="text-[11px]">Ajustes</span>
        </button>
      </nav>
    </>
  );
}
