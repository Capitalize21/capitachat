import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export default function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [status, setStatus] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (!data) return;
      setName(data.display_name); setAbout(data.about ?? ""); setStatus(data.status ?? ""); setAvatar(data.avatar_url);
    });
  }, [open, user]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ display_name: name, about, status, avatar_url: avatar }).eq("id", user!.id);
    if (error) toast.error(error.message); else { toast.success("Perfil guardado"); onOpenChange(false); }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const path = `${user!.id}/avatar-${Date.now()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>O seu perfil</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <button onClick={() => fileRef.current?.click()} className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatar ?? undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 grid place-items-center transition">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            </button>
          </div>
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Status</Label><Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ex: Disponível, Ocupado, No trabalho…" /></div>
          <div><Label>Sobre</Label><Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} /></div>
          <Button onClick={save} className="w-full bg-primary hover:bg-primary/90">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
