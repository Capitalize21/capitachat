import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, Mic, Square, MoreVertical, Pencil, Trash2, Users, Link as LinkIcon, CheckCheck, ArrowLeft, Phone, Globe, UserPlus, HelpCircle, Image as ImageIcon, Smile, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import type { Chat } from "./ChatLayout";
import { SUPPORT_PHONE, CAPITALIZE_URL } from "./ChatLayout";

type Message = {
  id: string; chat_id: string; sender_id: string; type: "text" | "image" | "audio" | "file";
  content: string | null; attachment_url: string | null; edited: boolean; deleted: boolean;
  created_at: string;
};

const EMOJIS = ["😀","😂","😍","👍","🙏","🎉","🔥","❤️","😎","😢","🤔","👏","💯","🙌","✨","😅"];

export default function ChatView({ chat, onChanged, onBack }: { chat: Chat; onChanged: () => void; onBack?: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<Message | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null; is_admin?: boolean }>>({});
  const [otherProfile, setOtherProfile] = useState<{ display_name: string; avatar_url: string | null; status: string | null; is_admin?: boolean } | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [recording, setRecording] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("chat_id", chat.id).order("created_at", { ascending: true }).limit(500);
      if (!cancelled) setMessages((data as Message[]) ?? []);
    })();
    const ch = supabase.channel(`msg-${chat.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chat.id}` }, (payload) => {
        if (payload.eventType === "INSERT") setMessages((m) => [...m, payload.new as Message]);
        if (payload.eventType === "UPDATE") setMessages((m) => m.map((x) => x.id === (payload.new as Message).id ? payload.new as Message : x));
        if (payload.eventType === "DELETE") setMessages((m) => m.filter((x) => x.id !== (payload.old as Message).id));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [chat.id]);

  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(messages.map((m) => m.sender_id)));
      const missing = ids.filter((id) => !profiles[id]);
      if (missing.length) {
        const { data } = await supabase.from("profiles").select("id,display_name,avatar_url,is_admin").in("id", missing);
        const next = { ...profiles };
        data?.forEach((p: any) => {
          // Forçamos admin supremo no chat view também
          if (p.id === user?.id && user?.email === 'contacto@capitalize.org.za') {
            p.is_admin = true;
          }
          next[p.id] = p;
        });
        setProfiles(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    (async () => {
      const { data: mems } = await supabase.from("chat_members").select("user_id").eq("chat_id", chat.id);
      setMemberCount(mems?.length ?? 0);
      if (chat.type === "private" && user) {
        const other = mems?.find((m) => m.user_id !== user.id)?.user_id;
        if (other) {
          const { data } = await supabase.from("profiles").select("display_name,avatar_url,status,is_admin").eq("id", other).single();
          setOtherProfile(data as any);
        }
      } else {
        setOtherProfile(null);
      }
    })();
  }, [chat, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    if (editing) {
      const { error } = await supabase.from("messages").update({ content: text, edited: true }).eq("id", editing.id);
      if (error) toast.error(error.message);
      setEditing(null); setText(""); return;
    }
    const { error } = await supabase.from("messages").insert({ chat_id: chat.id, sender_id: user!.id, type: "text", content: text });
    if (error) toast.error(error.message); else setText("");
  };

  const uploadAndSend = async (file: File, type: "image" | "audio" | "file") => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
    const { error } = await supabase.from("messages").insert({
      chat_id: chat.id, sender_id: user!.id, type, attachment_url: pub.publicUrl, content: file.name,
    });
    if (error) toast.error(error.message);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const type = f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : "file";
    await uploadAndSend(f, type);
    e.target.value = "";
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadAndSend(file, "audio");
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start(); recRef.current = rec; setRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const deleteMsg = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const copyInvite = () => {
    const url = `${window.location.origin}/?join=${chat.invite_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de convite copiado!");
  };

  const headerName = chat.type === "group" ? (chat.name ?? "Grupo") : (otherProfile?.display_name ?? "Conversa");
  const headerAvatar = chat.type === "group" ? chat.avatar_url : otherProfile?.avatar_url;
  const headerSub = chat.type === "group" ? `${memberCount} membros` : (otherProfile?.status ?? "online");

  return (
    <div className="flex-1 flex flex-col bg-chat-bg" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, var(--chat-pattern) 1px, transparent 1px), radial-gradient(circle at 70% 60%, var(--chat-pattern) 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
      {/* Header */}
      <div className="h-16 px-2 sm:px-4 flex items-center justify-between bg-panel-header border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          )}
          <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={headerAvatar ?? undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">{chat.type === "group" ? <Users className="h-5 w-5" /> : headerName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <p className="font-semibold truncate leading-tight flex items-center gap-1.5">
                {headerName}
                {otherProfile?.is_admin && <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500/10" />}
                {chat.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">official</span>}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{headerSub}</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <a href={`tel:${SUPPORT_PHONE}`} className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" title={`Suporte ${SUPPORT_PHONE}`}><Phone className="h-5 w-5" /></Button>
          </a>
          {chat.type === "group" && (
            <Button variant="ghost" size="icon" onClick={copyInvite} title="Copiar link de convite"><LinkIcon className="h-5 w-5" /></Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => setShowInfo(true)}><Users className="mr-2 h-4 w-4" /> Informações da conversa</DropdownMenuItem>
              {chat.type === "group" && (
                <DropdownMenuItem onClick={copyInvite}><LinkIcon className="mr-2 h-4 w-4" /> Copiar link de convite</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Capitalize</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`${CAPITALIZE_URL}/register`} target="_blank" rel="noreferrer"><UserPlus className="mr-2 h-4 w-4" /> Criar conta</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer"><Globe className="mr-2 h-4 w-4" /> Visitar site</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`tel:${SUPPORT_PHONE}`}><Phone className="mr-2 h-4 w-4" /> Suporte: {SUPPORT_PHONE}</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`${CAPITALIZE_URL}/help`} target="_blank" rel="noreferrer"><HelpCircle className="mr-2 h-4 w-4" /> Central de ajuda</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-16 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Ainda sem mensagens. Diga olá 👋</div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === user!.id;
          const prev = messages[i - 1];
          const showAuthor = (chat.type === "group" || !mine) && (!prev || prev.sender_id !== m.sender_id);
          const p = profiles[m.sender_id];
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
              <div className={`relative max-w-[80%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${mine ? "bg-bubble-out" : "bg-bubble-in"}`}>
                {showAuthor && (
                  <p className="text-xs font-semibold text-primary mb-0.5 flex items-center gap-1">
                    {p?.display_name ?? "User"}
                    {p?.is_admin && <BadgeCheck className="h-3.5 w-3.5 text-[#00a3ff] fill-[#00a3ff]/10" />}
                  </p>
                )}
                {m.deleted ? (
                  <p className="italic text-muted-foreground text-sm">Esta mensagem foi apagada</p>
                ) : m.type === "image" ? (
                  <a href={m.attachment_url ?? ""} target="_blank" rel="noreferrer">
                    <img src={m.attachment_url ?? ""} alt="" className="max-w-[240px] rounded-md" loading="lazy" />
                  </a>
                ) : m.type === "audio" ? (
                  <audio controls src={m.attachment_url ?? ""} className="max-w-[240px]" />
                ) : m.type === "file" ? (
                  <a href={m.attachment_url ?? ""} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline">
                    <Paperclip className="h-4 w-4" />{m.content ?? "File"}
                  </a>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                )}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground justify-end">
                  {m.edited && !m.deleted && <span>editada</span>}
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && <CheckCheck className="h-3 w-3 text-tick" />}
                </div>
                {mine && !m.deleted && (
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full"><MoreVertical className="h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {m.type === "text" && (
                          <DropdownMenuItem onClick={() => { setEditing(m); setText(m.content ?? ""); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteMsg(m.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Emoji bar */}
      {showEmoji && (
        <div className="px-3 py-2 bg-panel-header border-t border-border flex flex-wrap gap-1">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)} className="text-xl hover:scale-125 transition">{e}</button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="p-2 sm:p-3 bg-panel-header border-t border-border flex items-center gap-1 sm:gap-2">
        {editing && (
          <div className="text-xs text-primary mr-2">
            A editar… <button onClick={() => { setEditing(null); setText(""); }} className="underline">cancelar</button>
          </div>
        )}
        <input ref={fileRef} type="file" hidden onChange={onFile} />
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Button variant="ghost" size="icon" onClick={() => setShowEmoji((v) => !v)}><Smile className="h-5 w-5" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => imgRef.current?.click()}><ImageIcon className="mr-2 h-4 w-4" /> Imagem</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}><Paperclip className="mr-2 h-4 w-4" /> Ficheiro / áudio</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Escreva uma mensagem"
          className="bg-input border-0"
        />
        {text.trim() ? (
          <Button onClick={send} size="icon" className="bg-primary hover:bg-primary/90"><Send className="h-5 w-5" /></Button>
        ) : recording ? (
          <Button onClick={stopRec} size="icon" variant="destructive"><Square className="h-5 w-5" /></Button>
        ) : (
          <Button onClick={startRec} size="icon" className="bg-primary hover:bg-primary/90"><Mic className="h-5 w-5" /></Button>
        )}
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent>
          <DialogHeader><DialogTitle>{headerName}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={headerAvatar ?? undefined} />
              <AvatarFallback className="text-2xl">{headerName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground text-center">{headerSub}</p>
            {chat.description && <p className="text-sm text-center">{chat.description}</p>}
            {chat.type === "group" && chat.invite_code && (
              <Button variant="outline" onClick={copyInvite}><LinkIcon className="mr-2 h-4 w-4" />Copiar link de convite</Button>
            )}
            <div className="w-full border-t pt-3 mt-2 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Capitalize</p>
              <a href={`tel:${SUPPORT_PHONE}`} className="block">
                <Button variant="outline" className="w-full justify-start"><Phone className="mr-2 h-4 w-4" /> Suporte: {SUPPORT_PHONE}</Button>
              </a>
              <a href={`${CAPITALIZE_URL}/register`} target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full justify-start"><UserPlus className="mr-2 h-4 w-4" /> Criar conta Capitalize</Button>
              </a>
              <a href={CAPITALIZE_URL} target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full justify-start"><Globe className="mr-2 h-4 w-4" /> Visitar capitalize.org.za</Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
