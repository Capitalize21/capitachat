import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; display_name: string; avatar_url: string | null; status: string | null };

export default function NewPrivateChatDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (chatId: string) => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("id,display_name,avatar_url,status").neq("id", user.id).order("display_name").then(({ data }) => {
      setUsers((data as Profile[]) ?? []);
    });
  }, [open, user]);

  const start = async (other: Profile) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const { data: mine } = await supabase.from("chat_members").select("chat_id").eq("user_id", user.id);
      const myIds = (mine ?? []).map((m) => m.chat_id);
      let existing: string | null = null;
      if (myIds.length) {
        const { data: theirs } = await supabase
          .from("chat_members").select("chat_id").eq("user_id", other.id).in("chat_id", myIds);
        const shared = (theirs ?? []).map((m) => m.chat_id);
        if (shared.length) {
          const { data: priv } = await supabase
            .from("chats").select("id").eq("type", "private").in("id", shared).limit(1);
          if (priv?.[0]) existing = priv[0].id;
        }
      }
      if (existing) {
        onCreated(existing);
        onOpenChange(false);
        return;
      }
      const { data: chat, error } = await supabase
        .from("chats").insert({ type: "private", created_by: user.id }).select().single();
      if (error) throw error;
      const { error: mErr } = await supabase.from("chat_members").insert([
        { chat_id: chat.id, user_id: user.id, role: "member" },
        { chat_id: chat.id, user_id: other.id, role: "member" },
      ]);
      if (mErr) throw mErr;
      onCreated(chat.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível iniciar a conversa");
    } finally {
      setBusy(false);
    }
  };

  const filtered = users.filter((u) => u.display_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar pessoas pelo nome" className="pl-9" />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto border-t border-border">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum utilizador encontrado</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => start(p)}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition disabled:opacity-50 text-left"
            >
              <Avatar className="h-11 w-11">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {p.display_name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.status ?? "Disponível"}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
