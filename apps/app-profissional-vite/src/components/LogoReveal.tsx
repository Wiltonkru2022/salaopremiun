import { useCallback, useEffect, useState } from "react";
import { publicAsset } from "../lib/publicAsset";

/** Native-feeling startup animation; it needs no video decoder or network access. */
export function LogoReveal() {
  const [visible, setVisible] = useState(true);
  const finish = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const timeout = window.setTimeout(finish, 2_600);
    return () => window.clearTimeout(timeout);
  }, [finish]);

  if (!visible) return null;

  return (
    <div className="sp-reveal fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#080808] px-6" role="status" aria-label="Abrindo Salão Premium">
      <div className="sp-reveal-glow" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="sp-reveal-logo">
          <img src={publicAsset("brand-logo-profissional-v2.png")} alt="" className="h-32 w-32 rounded-[2rem] object-cover" />
        </div>
        <p className="sp-reveal-title mt-8 text-[11px] font-black uppercase tracking-[0.42em] text-[#f6c453]">Salão Premium</p>
        <p className="sp-reveal-subtitle mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">App profissional</p>
      </div>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-8 z-10 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur"
      >
        Pular
      </button>
    </div>
  );
}
