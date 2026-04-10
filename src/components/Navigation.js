/* __imports_rewritten__ */
import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';

const bottomNavContainerStyle = {
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  zIndex: 1200,
  padding: '5px 14px calc(env(safe-area-inset-bottom, 0px) + 4px)',
  background: `
    linear-gradient(
      180deg,
      rgba(3,7,12,0) 0%,
      rgba(3,7,12,0.03) 12%,
      rgba(3,7,12,0.12) 30%,
      rgba(3,7,12,0.34) 64%,
      rgba(3,7,12,0.52) 100%
    )
  `,
  backdropFilter: 'blur(7px) saturate(106%)',
  WebkitBackdropFilter: 'blur(7px) saturate(106%)',
  boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.012)'
};

const NAV_ICON_WRAP_STYLE = (isActive, key) => {
  const isDiscover = key === 'discover';
  const isMessages = key === 'messages';
  const isProfile = key === 'profile';

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    marginBottom: '7px',
    opacity: isActive ? 1 : 0.9,
    transform: isActive ? 'scale(1.03)' : 'scale(1)',
    filter: isDiscover
      ? (isActive ? 'drop-shadow(0 0 10px rgba(96,165,250,0.30))' : 'drop-shadow(0 0 7px rgba(96,165,250,0.18))')
      : isMessages
        ? (isActive ? 'drop-shadow(0 0 9px rgba(96,165,250,0.24))' : 'drop-shadow(0 0 6px rgba(96,165,250,0.15))')
        : isProfile
          ? (isActive ? 'drop-shadow(0 0 9px rgba(96,165,250,0.24)) brightness(1.06)' : 'drop-shadow(0 0 6px rgba(96,165,250,0.14)) brightness(1.04)')
          : (isActive ? 'drop-shadow(0 0 10px rgba(96,165,250,0.26))' : 'drop-shadow(0 0 7px rgba(96,165,250,0.16))'),
    transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease'
  };
};

const NAV_LABEL_STYLE = (isActive) => ({
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: isActive ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.68)',
  transition: 'color 180ms ease, opacity 180ms ease'
});

const NavItem = ({ label, active, href, itemKey, icon = null }) => html`
  <a
    href=${href}
    className="vibes-bottom-nav-tab flex flex-col items-center justify-center flex-1 h-full"
    aria-current=${active ? 'page' : undefined}
  >
    ${icon && html`
      <span
        className="vibes-bottom-nav-tab__icon"
        style=${NAV_ICON_WRAP_STYLE(active, itemKey)}
      >
        ${icon}
      </span>
    `}
    <span
      className=${`vibes-bottom-nav-tab__label ${active ? 'is-active' : ''}`}
      style=${NAV_LABEL_STYLE(active)}
    >
      ${label}
    </span>
  </a>
`;

export default function Navigation({ activeTab }) {
  return html`
    <nav
      className="vibes-bottom-nav flex items-center"
      style=${bottomNavContainerStyle}
    >
      <${NavItem} label="Looking For" itemKey="mood" active=${activeTab === 'mood'} href="#/mood" />
      <${NavItem} label="Match" itemKey="discover" active=${activeTab === 'map'} href="#/" />
      <${NavItem} label="Messages" itemKey="messages" active=${activeTab === 'messages'} href="#/messages" />
      <${NavItem} label="Profile" itemKey="profile" active=${activeTab === 'profile'} href="#/profile" />
    </nav>
  `;
}
