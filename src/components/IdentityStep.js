import React from 'https://esm.sh/react@19.2.0';
import { html } from '../jsx.js';
import { supabase } from '../lib/supabase.js';

export default function IdentityStep({ onFinish }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState('');

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!email || !password) {
      setAuthError('Enter email and password');
      return;
    }

    setIsSubmitting(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('LOGIN RESULT:', data, error);

      if (error) throw error;

      onFinish?.();
    } catch (err) {
      console.error(err);
      setAuthError(err?.message || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return html`
    <div
      style=${{
        position: 'fixed',
        inset: '0',
        zIndex: '999999',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto'
      }}
    >
      <div
        style=${{
          width: '100%',
          maxWidth: '320px',
          padding: '24px',
          pointerEvents: 'auto'
        }}
      >
        <form
          onSubmit=${handleSubmit}
          style=${{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'auto'
          }}
        >
          <h1
            style=${{
              color: '#fff',
              fontSize: '32px',
              fontWeight: '800',
              textAlign: 'center',
              margin: '0 0 8px'
            }}
          >
            Login
          </h1>

          <input
            type="email"
            placeholder="Email"
            value=${email}
            onInput=${(e) => setEmail(e.currentTarget.value)}
            style=${{
              width: '100%',
              height: '48px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: '1000000'
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value=${password}
            onInput=${(e) => setPassword(e.currentTarget.value)}
            style=${{
              width: '100%',
              height: '48px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: '1000000'
            }}
          />

          ${authError ? html`
            <div
              style=${{
                color: '#fca5a5',
                fontSize: '14px',
                textAlign: 'center'
              }}
            >
              ${authError}
            </div>
          ` : null}

          <button
            type="submit"
            style=${{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              border: 'none',
              background: '#fff',
              color: '#000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: '1000000'
            }}
          >
            ${isSubmitting ? 'Please wait...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  `;
}