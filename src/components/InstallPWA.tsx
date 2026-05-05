import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Escuta o evento oficial do navegador
    const handler = (e: any) => {
      console.log("PWA: Evento detectado!");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Se já estiver instalado, esconde
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Dispara o prompt oficial
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  return (
    <Button 
      onClick={handleInstallClick}
      className="w-full bg-[#00a3ff] hover:bg-[#0082cc] text-white shadow-lg font-bold py-6 text-lg"
    >
      <Download className="mr-3 h-6 w-6" /> Instalar Capitalize App
    </Button>
  );
}
