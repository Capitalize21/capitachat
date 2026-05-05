import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const code = () => Math.random().toString(36).slice(2, 10);

export default function NewGroupDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("chats").insert({
      type: "group", name, description: desc, invite_code: code(), created_by: user!.id,
    }).select().single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    await supabase.from("chat_members").insert({ chat_id: data.id, user_id: user!.id, role: "admin" });
    toast.success("Grupo criado!");
    setName(""); setDesc(""); setBusy(false);
    onCreated(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo grupo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome do grupo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          <Button disabled={busy} onClick={create} className="w-full bg-primary hover:bg-primary/90">{busy ? "A criar…" : "Criar grupo"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
