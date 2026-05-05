import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "./Sidebar";
import ChatView from "./ChatView";
import ProfileDialog from "./ProfileDialog";
import NewGroupDialog from "./NewGroupDialog";
import JoinGroupDialog from "./JoinGroupDialog";
import NewPrivateChatDialog from "./NewPrivateChatDialog";
import { InstallPWA } from "../InstallPWA";
import logo from "@/assets/logo.png";
import { Phone, Globe, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SUPPORT_PHONE = "874974566";
export const CAPITALIZE_URL = "https://www.capitalize.org.za";

export type Chat = {
  id: string;
  type: "private" | "group";
  name: string | null;
  avatar_url: string | null;
  description: string | null;
  invite_code: string | null;
  is_default: boolean;
};

export default function ChatLayout() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showNewPrivate, setShowNewPrivate] = useState(false);

  const loadChats = async () => {
    const { data: members } = await supabase.from("chat_members").select("chat_id").eq("user_id", user!.id);
    const ids = members?.map((m) => m.chat_id) ?? [];
    if (!ids.length) { setChats([]); return; }
    const { data } = await supabase.from("chats").select("*").in("id", ids).order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setChats((data as Chat[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    loadChats();
    const ch = supabase.channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members", filter: `user_id=eq.${user.id}` }, () => loadChats())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, () => loadChats())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const active = chats.find((c) => c.id === activeId) ?? null;

  return (
    <div className="h-[100dvh] w-screen flex bg-chat-bg overflow-hidden">
      {/* Sidebar — full-screen on mobile when no active chat */}
      <div className={`${active ? "hidden md:flex" : "flex"} w-full md:w-[360px] flex-shrink-0 flex-col border-r border-border bg-sidebar`}>
        <Sidebar
          chats={chats}
          activeId={activeId}
          onSelect={setActiveId}
          onProfile={() => setShowProfile(true)}
          onNewGroup={() => setShowNewGroup(true)}
          onJoin={() => setShowJoin(true)}
          onNewPrivate={() => setShowNewPrivate(true)}
        />
      </div>

      {/* Chat view */}
      <div className={`${active ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {active ? (
          <ChatView chat={active} onBack={() => setActiveId(null)} onChanged={loadChats} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-panel-header">
            <img src={logo} alt="Capitalize Chat" width={140} height={140} className="opacity-90" loading="lazy" />
            <h2 className="mt-4 text-2xl font-semibold text-foreground">Bem-vindo ao Capitalize Chat</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">Selecione uma conversa para começar ou entre num grupo através de um link de convite.</p>
            
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              <InstallPWA />
              <a href={`tel:${SUPPORT_PHONE}`} className="w-full">
                <Button variant="outline" className="w-full"><Phone className="mr-2 h-4 w-4" /> Suporte: {SUPPORT_PHONE}</Button>
              </a>
              <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer" className="w-full">
                <Button variant="outline" className="w-full"><Globe className="mr-2 h-4 w-4" /> Visitar capitalize.org.za</Button>
              </a>
              <a href={`${CAPITALIZE_URL}/register`} target="_blank" rel="noreferrer" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4" /> Criar conta Capitalize</Button>
              </a>
            </div>
          </div>
        )}
      </div>

      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
      <NewGroupDialog open={showNewGroup} onOpenChange={setShowNewGroup} onCreated={loadChats} />
      <JoinGroupDialog open={showJoin} onOpenChange={setShowJoin} onJoined={loadChats} />
      <NewPrivateChatDialog
        open={showNewPrivate}
        onOpenChange={setShowNewPrivate}
        onCreated={async (chatId) => { await loadChats(); setActiveId(chatId); }}
      />
    </div>
  );
}
