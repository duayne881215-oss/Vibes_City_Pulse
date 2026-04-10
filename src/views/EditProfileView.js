/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

function normalizeProfileDraft(src) {
  const safe = src || {};

  const rawLookingFor = safe.looking_for ?? safe.lookingFor ?? '';
  const normalizedLookingFor = Array.isArray(rawLookingFor)
    ? (rawLookingFor[0] || 'Vibes')
    : (rawLookingFor || 'Vibes');

  const rawBirthday = (safe.birthday ?? safe.birth_date ?? '').toString().trim();
  const normalizedBirthday = /^\d{4}-\d{2}-\d{2}$/.test(rawBirthday)
    ? rawBirthday
    : (() => {
        if (!rawBirthday) return '';
        const parsed = new Date(rawBirthday);
        if (Number.isNaN(parsed.getTime())) return '';
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      })();

  return {
    ...safe,
    displayName: safe.displayName ?? safe.display_name ?? '',
    birthday: normalizedBirthday,
    city: safe.city ?? '',
    bio: safe.bio ?? '',
    instagram: safe.instagram ?? '',
    tiktok: safe.tiktok ?? '',
    gender: safe.gender ?? '',
    interestedIn: safe.interestedIn ?? safe.interested_in ?? '',
    lookingFor: normalizedLookingFor,
    avatarUrl: safe.avatarUrl ?? safe.avatar_url ?? '',
    avatar_url: safe.avatar_url ?? safe.avatarUrl ?? ''
  };
}

export default function EditProfileView({ profileData, onSave, onPhotoChange, onClose, onDiscardChanges }) {
  const normalizedInitialDraft = React.useMemo(
    () => normalizeProfileDraft(profileData),
    [profileData]
  );

  const [draft, setDraft] = React.useState(normalizedInitialDraft);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [birthdayText, setBirthdayText] = React.useState(() =>
    formatBirthdayDisplay(normalizedInitialDraft?.birthday || '')
  );

  function formatBirthdayDisplay(value) {
    if (!value) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return '';
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }

  function parseBirthdayInput(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

    let display = '';
    if (digits.length <= 2) {
      display = digits;
    } else if (digits.length <= 4) {
      display = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    let iso = '';
    if (digits.length === 8) {
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);

      const month = Number(mm);
      const day = Number(dd);
      const year = Number(yyyy);

      const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      const valid =
        year >= 1900 &&
        year <= 2100 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31 &&
        !Number.isNaN(dt.getTime()) &&
        dt.getFullYear() === year &&
        dt.getMonth() + 1 === month &&
        dt.getDate() === day;

      if (valid) {
        iso = `${yyyy}-${mm}-${dd}`;
      }
    }

    return { display, iso };
  }

  const scrollRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const lastHydratedKeyRef = React.useRef('');

  React.useEffect(() => {
    const nextKey = JSON.stringify({
      id: profileData?.id ?? '',
      avatarUrl: profileData?.avatarUrl ?? profileData?.avatar_url ?? '',
      displayName: profileData?.displayName ?? profileData?.display_name ?? '',
      birthday: profileData?.birthday ?? profileData?.birth_date ?? '',
      city: profileData?.city ?? '',
      bio: profileData?.bio ?? '',
      instagram: profileData?.instagram ?? '',
      tiktok: profileData?.tiktok ?? '',
      gender: profileData?.gender ?? '',
      interestedIn: profileData?.interestedIn ?? profileData?.interested_in ?? '',
      lookingFor: profileData?.lookingFor ?? profileData?.looking_for ?? ''
    });

    if (lastHydratedKeyRef.current === nextKey) return;
    lastHydratedKeyRef.current = nextKey;

    setDraft(normalizeProfileDraft(profileData));

    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTop = 0;
    });
  }, [profileData]);

  React.useEffect(() => {
    setBirthdayText(formatBirthdayDisplay(draft.birthday || ''));
  }, [draft.birthday]);

  React.useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const jumpTop = () => {
      node.scrollTop = 0;
    };

    jumpTop();
    const r1 = requestAnimationFrame(jumpTop);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(jumpTop));
    const t = setTimeout(jumpTop, 140);

    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      clearTimeout(t);
    };
  }, []);

  const setField = React.useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePhotoPick = React.useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handlePhotoFile = React.useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || typeof onPhotoChange !== 'function') return;

    try {
      setIsUploading(true);
      const nextUrl = await onPhotoChange('', file);
      if (nextUrl) {
        setDraft((prev) => ({ ...prev, avatarUrl: nextUrl, avatar_url: nextUrl }));
      }
    } finally {
      setIsUploading(false);
      if (e?.target) e.target.value = '';
    }
  }, [onPhotoChange]);

  const onPhotoRemove = React.useCallback(async () => {
    if (typeof onPhotoChange !== 'function') return;

    try {
      setIsUploading(true);
      const nextUrl = await onPhotoChange('');
      setDraft((prev) => ({ ...prev, avatarUrl: nextUrl || '', avatar_url: nextUrl || '' }));
    } finally {
      setIsUploading(false);
    }
  }, [onPhotoChange]);

  const handleSave = React.useCallback(async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      await onSave?.({
        ...draft,
        interested_in: draft.interestedIn ?? '',
        looking_for: draft.lookingFor ?? 'Vibes',
        birth_date: draft.birthday ?? ''
      });
    } finally {
      setIsSaving(false);
    }
  }, [draft, isSaving, onSave]);

  const LABEL_CLASS =
    'block text-center text-[10px] font-black tracking-[0.34em] uppercase text-white/34 mb-3';

  const INPUT_STYLE = {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
  };

  const CHOICE_BASE =
    'h-12 rounded-[18px] text-[13px] font-medium tracking-[-0.02em] inline-flex items-center justify-center tap-feedback transition-all duration-300';

  const isGender = (value) => (draft.gender || '').toLowerCase() === value.toLowerCase();
  const isInterest = (value) => (draft.interestedIn || '').toLowerCase() === value.toLowerCase();

  const choiceStyle = (active) =>
    active
      ? {
          color: 'rgba(255,255,255,0.98)',
          border: '1px solid rgba(244,114,182,0.38)',
          background: 'linear-gradient(180deg, rgba(13,18,42,0.96), rgba(8,12,30,0.94))',
          boxShadow: '0 0 0 1px rgba(244,114,182,0.14), 0 0 18px rgba(236,72,153,0.16), inset 0 1px 0 rgba(255,255,255,0.04)'
        }
      : {
          color: 'rgba(255,255,255,0.58)',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
        };

  return html`
    <div
      ref=${scrollRef}
      className="h-full overflow-y-auto scrollbar-hide px-0 pt-0 pb-[160px]"
      style=${{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      <div className="px-1 pt-1">
        <div className="mt-3">
          <div className=${LABEL_CLASS}>Profile Photo</div>

          <div className="flex flex-col items-center">
            <div
              className="w-[150px] h-[150px] rounded-full overflow-hidden"
              style=${{
                border: '1.5px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.04)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.22)'
              }}
            >
              <img
                src=${draft.avatarUrl || draft.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick=${() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-full transition active:scale-[0.98]"
                style=${{
                  height: '24px',
                  padding: '0 10px',
                  border: '1px solid rgba(255,255,255,0.54)',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '7px',
                  fontWeight: '800',
                  letterSpacing: '0.24em',
                  lineHeight: '1',
                  minWidth: '118px',
                  boxShadow: 'none'
                }}
              >
                CHANGE PHOTO
              </button>

              <button
                type="button"
                onClick=${onPhotoRemove}
                className="inline-flex items-center justify-center rounded-full transition active:scale-[0.98]"
                style=${{
                  height: '24px',
                  padding: '0 10px',
                  border: '1px solid rgba(255,80,120,0.22)',
                  background: 'rgba(80,20,45,0.16)',
                  color: 'rgba(255,120,150,0.92)',
                  fontSize: '7px',
                  fontWeight: '800',
                  letterSpacing: '0.20em',
                  lineHeight: '1',
                  minWidth: '86px',
                  boxShadow: 'none'
                }}
              >
                REMOVE
              </button>
            </div>

            <input
              ref=${fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange=${handlePhotoFile}
            />
          </div>
        </div>

        <div className="mt-10">
          <label className=${LABEL_CLASS}>Display Name</label>
          <div className="relative">
            <input
              type="text"
              value=${draft.displayName || ''}
              onInput=${(e) => setField('displayName', e.target.value)}
              className="w-full h-[56px] rounded-[22px] px-6 text-white text-[17px] focus:outline-none"
              style=${INPUT_STYLE}
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5">
          <div className="min-w-0">
            <label className="mb-3 block text-center text-[11px] font-semibold tracking-[0.42em] text-white/92">
              BIRTHDAY
            </label>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              value=${birthdayText}
              onChange=${(e) => {
                const next = parseBirthdayInput(e.target.value || '');
                setBirthdayText(next.display);
                setDraft((prev) => ({
                  ...prev,
                  birthday: next.iso || ''
                }));
              }}
              className="w-full rounded-[24px] px-4 text-center text-white focus:outline-none"
              style=${{
                height: '56px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(20,28,58,0.72), rgba(20,28,58,0.72))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              placeholder="MM/DD/YYYY"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-3 block text-center text-[11px] font-semibold tracking-[0.42em] text-white/92">
              CITY
            </label>
            <input
              type="text"
              value=${draft.city || ''}
              onChange=${(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full rounded-[24px] px-4 text-center text-white focus:outline-none"
              style=${{
                height: '56px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(20,28,58,0.72), rgba(20,28,58,0.72))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              placeholder="City"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-3 block text-center text-[11px] font-semibold tracking-[0.42em] text-white/92">
              INSTAGRAM
            </label>
            <input
              type="text"
              value=${draft.instagram || ''}
              onChange=${(e) => setDraft((prev) => ({ ...prev, instagram: e.target.value }))}
              className="w-full rounded-[24px] px-4 text-center text-white focus:outline-none"
              style=${{
                height: '56px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(20,28,58,0.72), rgba(20,28,58,0.72))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              placeholder="@instagram"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-3 block text-center text-[11px] font-semibold tracking-[0.42em] text-white/92">
              TIKTOK
            </label>
            <input
              type="text"
              value=${draft.tiktok || ''}
              onChange=${(e) => setDraft((prev) => ({ ...prev, tiktok: e.target.value }))}
              className="w-full rounded-[24px] px-4 text-center text-white focus:outline-none"
              style=${{
                height: '56px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(20,28,58,0.72), rgba(20,28,58,0.72))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              placeholder="@tiktok"
            />
          </div>
        </div>

        <div className="mt-7">
          <label className=${LABEL_CLASS}>Bio</label>
          <textarea
            value=${draft.bio || ''}
            onInput=${(e) => setField('bio', e.target.value)}
            className="w-full min-h-[150px] rounded-[26px] px-6 py-5 text-white text-[17px] resize-none focus:outline-none"
            style=${INPUT_STYLE}
            placeholder="Tell people your vibe"
          ></textarea>
        </div>

        <div className="mt-9">
          <label className=${LABEL_CLASS}>I Am</label>
          <div className="grid grid-cols-3 gap-3">
            ${['Man', 'Woman', 'Other'].map((item) => html`
              <button
                key=${item}
                type="button"
                onClick=${() => setField('gender', item)}
                className=${CHOICE_BASE}
                style=${choiceStyle(isGender(item))}
              >
                ${item}
              </button>
            `)}
          </div>
        </div>

        <div className="mt-8">
          <label className=${LABEL_CLASS}>Interested In</label>
          <div className="grid grid-cols-3 gap-3">
            ${['Men', 'Women', 'Everyone'].map((item) => html`
              <button
                key=${item}
                type="button"
                onClick=${() => setField('interestedIn', item)}
                className=${CHOICE_BASE}
                style=${choiceStyle(isInterest(item))}
              >
                ${item}
              </button>
            `)}
          </div>
        </div>

        <div className="mt-9 space-y-3">
          <button
            type="button"
            onClick=${handleSave}
            disabled=${isSaving}
            className="w-full h-[52px] rounded-[20px] text-[12px] font-black tracking-[0.26em] uppercase tap-feedback"
            style=${{
              color: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
            }}
          >
            ${isSaving ? 'Saving' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick=${onDiscardChanges || onClose}
            className="w-full h-[52px] rounded-[20px] text-[12px] font-black tracking-[0.26em] uppercase tap-feedback"
            style=${{
              color: 'rgba(255,255,255,0.74)',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}
