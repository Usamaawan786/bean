import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

function CameraCard({ cam }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const snap = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await base44.functions.invoke("imouCameras", { action: "snapshot", deviceId: cam.id });
      const d = res?.data || res;
      if (d?.url) setUrl(d.url);
      else setErr(d?.error || "No image returned");
    } catch (e) {
      setErr(e?.message || "Failed");
    }
    setBusy(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="aspect-video bg-stone-900 flex items-center justify-center">
        {url ? (
          <img src={url} alt={cam.name} className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-8 h-8 text-stone-600" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-stone-900 text-sm">{cam.name}</p>
            <p className="text-xs text-stone-500">{cam.zone}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cam.online ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {cam.online ? "Online" : "Offline"}
          </span>
        </div>
        {(err || cam.error) && <p className="text-xs text-red-600 mt-2">{err || cam.error}</p>}
        <button
          onClick={snap}
          disabled={busy}
          className="mt-3 w-full text-sm font-medium bg-[#6B5744] text-white rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Take snapshot
        </button>
      </div>
    </div>
  );
}

export default function AdminCameras() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["imouCameras"],
    queryFn: async () => {
      const res = await base44.functions.invoke("imouCameras", { action: "list" });
      return res?.data || res;
    },
    refetchInterval: 60000,
  });

  const cameras = data?.cameras || [];
  const zones = [...new Set(cameras.map((c) => c.zone))];

  return (
    <div className="min-h-screen bg-stone-50 p-4 pb-16 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Cameras</h1>
          <p className="text-sm text-stone-500">Live status and on-demand snapshots</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg bg-white border border-stone-200">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading && <Loader2 className="w-6 h-6 animate-spin text-stone-400 mx-auto mt-10" />}

      {data?.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>{data.message || data.error}</div>
        </div>
      )}

      {zones.map((z) => (
        <div key={z} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">{z}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cameras.filter((c) => c.zone === z).map((c) => (
              <CameraCard key={c.id} cam={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
