import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinGroupDialog({ open, onOpenChange, onJoined }: { open: boolean; onOpenChange: (v: boolean) => void; onJoined: () => void }) {
  const { user } = useAuth();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    const code = val.includes("join=") ? val.split("join=")[1].split("&")[0] : val.trim();
    const { data: chat, error } = await supabase.from("chats").select("id").eq("invite_code", code).maybeSingle();
    if (error || !chat) { toast.error("Código de convite inválido"); setBusy(false); return; }
    const { error: memErr } = await supabase.from("chat_members").insert({ chat_id: chat.id, user_id: user!.id });
    if (memErr && !memErr.message.includes("duplicate")) { toast.error(memErr.message); setBusy(false); return; }
    toast.success("Entrou no grupo!");
    setVal(""); setBusy(false);
    onJoined(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Entrar em grupo por link</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Link ou código de convite</Label><Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="https://… ou código" /></div>
          <Button disabled={busy} onClick={join} className="w-full bg-primary hover:bg-primary/90">{busy ? "A entrar…" : "Entrar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
