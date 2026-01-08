import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

// Logo EFFE - usa il file dalla cartella public
function EffeLogo() {
  return (
    <img 
      src="/logo.jpg" 
      alt="EFFE Logo" 
      style={{ width: '60px', height: '60px', objectFit: 'contain' }}
    />
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { signIn, error: authError, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!email || !password) {
      setLocalError('Inserisci email e password');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      // Error is already handled by AuthContext
    }
  };

  const error = localError || authError;

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '20px',
      }}
    >
      <Card 
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <CardHeader style={{ textAlign: 'center', paddingBottom: '8px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <EffeLogo />
          </div>
          
          <CardTitle style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e' }}>
            EFFE Dashboard
          </CardTitle>
          <CardDescription style={{ color: '#64748b', marginTop: '8px' }}>
            Accedi per visualizzare le tue performance
          </CardDescription>
        </CardHeader>

        <CardContent style={{ paddingTop: '16px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="email" style={{ fontWeight: '500', color: '#374151' }}>
                Email
              </Label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: '#9ca3af'
                  }} 
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@azienda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    paddingLeft: '42px',
                    height: '48px',
                    fontSize: '16px',
                    borderColor: '#e5e7eb',
                  }}
                  disabled={isSubmitting || loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Label htmlFor="password" style={{ fontWeight: '500', color: '#374151' }}>
                Password
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '18px',
                    height: '18px',
                    color: '#9ca3af'
                  }} 
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    paddingLeft: '42px',
                    paddingRight: '42px',
                    height: '48px',
                    fontSize: '16px',
                    borderColor: '#e5e7eb',
                  }}
                  disabled={isSubmitting || loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#9ca3af',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '18px', height: '18px' }} />
                  ) : (
                    <Eye style={{ width: '18px', height: '18px' }} />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || loading}
              style={{
                width: '100%',
                height: '48px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#E86A10',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              {isSubmitting || loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </Button>
          </form>

          <div style={{ 
            marginTop: '24px', 
            paddingTop: '24px', 
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Non hai un account?{' '}
              <span style={{ color: '#E86A10', fontWeight: '500' }}>
                Contatta l'amministratore
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p style={{ 
        marginTop: '32px', 
        fontSize: '14px', 
        color: 'rgba(255,255,255,0.5)'
      }}>
        © {new Date().getFullYear()} EFFE Dashboard
      </p>
    </div>
  );
}
