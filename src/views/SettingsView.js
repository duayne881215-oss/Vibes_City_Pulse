/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import { supabase } from '../lib/supabase.js';

export default function SettingsView({
  profileData,
  onSave,
  onClose,
  onDiscardChanges,
  blockedUserIds = [],
  onUnblockUser
}) {
  const [draft, setDraft] = React.useState(profileData);
  const [blockedProfiles, setBlockedProfiles] = React.useState([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = React.useState(false);

  // Gallery photos (local-only, autosaved silently)
  const [galleryPhotos, setGalleryPhotos] = React.useState(profileData.photos || []);
  const fileInputRef = React.useRef(null);

  const handleAddPhoto = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const photoData = reader.result;
      if (!photoData) return;

      setGalleryPhotos((prev) => {
        const newPhotos = [...prev, photoData].slice(0, 6);

        setDraft((currentDraft) => {
          const nextDraft = { ...currentDraft, photos: newPhotos };
          onSave?.(nextDraft, { silent: true });
          return nextDraft;
        });

        return newPhotos;
      });
    };

    reader.readAsDataURL(file);
  };

  // Force sheet scroll to top on open
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchBlockedProfiles = async () => {
      if (!supabase || blockedUserIds.length === 0) {
        setBlockedProfiles([]);
        setIsLoadingBlocked(false);
        return;
      }

      setIsLoadingBlocked(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', blockedUserIds);

        if (cancelled) return;

        if (!error && Array.isArray(data)) {
          setBlockedProfiles(data);
        } else {
          setBlockedProfiles([]);
        }
      } catch (err) {
        console.error('Error fetching blocked profiles:', err);
        if (!cancelled) setBlockedProfiles([]);
      } finally {
        if (!cancelled) setIsLoadingBlocked(false);
      }
    };

    fetchBlockedProfiles();

    return () => {
      cancelled = true;
    };
  }, [blockedUserIds]);

  React.useEffect(() => {
    const safeProfile = profileData || {};

    setDraft(safeProfile);
    setGalleryPhotos(Array.isArray(safeProfile.photos) ? safeProfile.photos : []);
  }, [profileData]);

  React.useLayoutEffect(() => {
    const inner = scrollRef.current;
    if (!inner) return;

    const getScrollParent = (node) => {
      let el = node?.parentElement;
      while (el) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return el;
        el = el.parentElement;
      }
      return null;
    };

    const scrollParent = getScrollParent(inner);
    if (!scrollParent) return;

    const forceTop = () => {
      scrollParent.scrollTop = 0;
    };

    forceTop();
    const raf1 = requestAnimationFrame(forceTop);
    const raf2 = requestAnimationFrame(forceTop);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [profileData]);

  const applyAndSave = async (patch) => {
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    try {
      // Silent autosave: must not close/navigate away.
      await onSave?.(nextDraft, { silent: true });
    } catch (e) {
      // onSave is expected to surface user-visible errors upstream
      console.error('Settings save failed:', e);
    }
  };

  const labelClass = 'text-[10px] tracking-[0.22em] text-white/35 ml-1 uppercase';

  return html`
    <div
      ref=${scrollRef}
      className="space-y-5 animate-fade-in pb-5 relative pt-4"
      style=${{ overflowAnchor: 'none' }}
    >
      <input
        type="file"
        ref=${fileInputRef}
        className="hidden"
        accept="image/*"
        onChange=${(e) => {
          const file = e.target.files && e.target.files[0];
          try {
            e.target.value = '';
          } catch (err) {}
          handleAddPhoto(file);
        }}
      />

      <div className="mt-6">
        <div className="text-[11px] tracking-[0.25em] text-white/30 uppercase font-bold mb-3">
          Photos
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          ${galleryPhotos.map(
            (p, i) => html`
              <div
                key=${i}
                className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
              >
                <img src=${p} className="w-full h-full object-cover" />
              </div>
            `
          )}
        </div>

        ${galleryPhotos.length < 6
          ? html`
              <button
                type="button"
                onClick=${() => fileInputRef.current && fileInputRef.current.click()}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-bold"
              >
                Add Photo
              </button>
            `
          : null}
      </div>

      <div className="space-y-3">
        <label className=${labelClass}>NOTIFICATIONS</label>
        <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white/90">Message Notifications</span>
            <span className="text-[10px] text-white/30">Get alerted when you receive a vibe</span>
          </div>
          <button
            type="button"
            onClick=${() => {
              const next = !draft.notificationsEnabled;
              applyAndSave({ notificationsEnabled: next });
            }}
            className=${`w-12 h-6 rounded-full transition-all duration-300 relative ${
              draft.notificationsEnabled ? 'bg-blue-600' : 'bg-white/10'
            }`}
          >
            <div
              className=${`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                draft.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className=${labelClass}>PRIVACY</label>
        <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white/90">Profile Visibility</span>
            <span className="text-[10px] text-white/30">Show me on the map</span>
          </div>
          <button
            type="button"
            onClick=${() => {
              const next = !(draft.isVisible !== undefined ? !!draft.isVisible : true);
              applyAndSave({ isVisible: next });
            }}
            className=${`w-12 h-6 rounded-full transition-all duration-300 relative ${
              (draft.isVisible !== undefined ? !!draft.isVisible : true) ? 'bg-blue-600' : 'bg-white/10'
            }`}
          >
            <div
              className=${`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                (draft.isVisible !== undefined ? !!draft.isVisible : true) ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white/90">Location Sharing</span>
            <span className="text-[10px] text-white/30">Allow location-based vibes</span>
          </div>
          <button
            type="button"
            onClick=${() => {
              const next = !(draft.locationSharingEnabled !== undefined ? !!draft.locationSharingEnabled : true);
              applyAndSave({ locationSharingEnabled: next });
            }}
            className=${`w-12 h-6 rounded-full transition-all duration-300 relative ${
              (draft.locationSharingEnabled !== undefined ? !!draft.locationSharingEnabled : true)
                ? 'bg-blue-600'
                : 'bg-white/10'
            }`}
          >
            <div
              className=${`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                (draft.locationSharingEnabled !== undefined ? !!draft.locationSharingEnabled : true)
                  ? 'translate-x-6'
                  : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-4">
            <div className="text-[10px] text-white/30">
              Location is used to show nearby vibes. You can disable visibility above.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className=${labelClass}>BLOCKED USERS</label>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-bold text-white/90">Blocked Users</span>
          </div>
          <div className="max-h-40 overflow-y-auto">
            ${blockedUserIds.length === 0
              ? html`
                  <div className="p-4 text-center">
                    <span className="text-xs text-white/20">No blocked users</span>
                  </div>
                `
              : isLoadingBlocked
                ? html`
                    <div className="p-4 text-center">
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto"></div>
                    </div>
                  `
                : blockedProfiles.map(
                    (p) => html`
                      <div
                        key=${p.id}
                        className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-sm text-white/70 font-medium">${p.display_name}</span>
                        <button
                          onClick=${() => onUnblockUser(p.id)}
                          className="text-[10px] font-black tracking-widest uppercase text-blue-400 hover:text-blue-300 tap-feedback"
                        >
                          Unblock
                        </button>
                      </div>
                    `
                  )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick=${() => {
            try {
              window.dispatchEvent(new CustomEvent('vibes:request-logout'));
            } catch (e) {
              try {
                window.dispatchEvent(new Event('vibes:request-logout'));
              } catch (e2) {}
            }
          }}
          className="w-full h-14 rounded-2xl border border-white/10 bg-white/[0.02] text-white/60 font-black tracking-[0.2em] uppercase text-[11px] hover:bg-white/[0.04] hover:text-white/75 tap-feedback"
        >
          Log out
        </button>

        <button
          type="button"
          onClick=${() => {
            try {
              window.dispatchEvent(new CustomEvent('vibes:request-delete-account'));
            } catch (e) {
              try {
                window.dispatchEvent(new Event('vibes:request-delete-account'));
              } catch (e2) {}
            }
          }}
          className="w-full h-14 mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 font-black tracking-[0.2em] uppercase text-[11px] hover:bg-rose-500/15 hover:text-rose-300 tap-feedback"
        >
          Delete account
        </button>
      </div>
    </div>
  `;
}
