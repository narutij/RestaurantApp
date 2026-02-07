import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Derive inline validation hints
  const passwordMismatch = isSignup && confirmPassword.length > 0 && password !== confirmPassword;
  const passwordTooShort = isSignup && password.length > 0 && password.length < 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!email || !password || (isSignup && !name)) {
      setFormError(t('login.fillAllFields'));
      return;
    }

    if (isSignup && password.length < 6) {
      setFormError(t('login.weakPassword'));
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setFormError(t('login.passwordsDontMatch'));
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        // Create account request
        await addDoc(collection(db, 'accountRequests'), {
          name,
          email,
          password,
          status: 'pending',
          role: null,
          requestedAt: new Date(),
          approvedAt: null,
          approvedBy: null
        });

        setFormSuccess(t('login.requestSent'));
        setFormError(null);

        setIsSignup(false);
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        await login(email, password);
        toast({
          title: "Welcome back!",
          description: "Logged in successfully"
        });
      }
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setFormError(t('login.incorrectPassword'));
      } else if (code === 'auth/user-not-found') {
        setFormError(t('login.userNotFound'));
      } else if (code === 'auth/too-many-requests') {
        setFormError(t('login.tooManyAttempts'));
      } else if (isSignup) {
        setFormError(t('login.requestFailed'));
      } else {
        setFormError(error.message || t('login.incorrectPassword'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await signInWithGoogle();
      toast({
        title: "Welcome!",
        description: "Signed in with Google successfully"
      });
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-y-auto" style={{ background: 'linear-gradient(135deg, #18191B 0%, #1D1F21 40%, #242628 100%)' }}>
      {/* Full-screen gradient overlay for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(0,0,0,0.5) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)' }} />

      {/* Main Content - scrollable, shifted 10px up */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10" style={{ marginTop: '-10px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo & Branding */}
          <div className="text-center mb-8 -mt-1">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative inline-block"
            >
              <img
                src="/logos/Vilko_puota_logo_white.png"
                alt="Vilko Puota"
                className="h-60 mx-auto drop-shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-white/60 -mt-14 text-sm font-light tracking-[0.2em] uppercase">
                Restaurant Hub
              </p>
            </motion.div>
          </div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.06] p-8 shadow-2xl"
          >
            {/* Tab Switcher */}
            <div className="flex bg-white/[0.04] rounded-full p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setName('');
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                  !isSignup
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('login.signIn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignup(true);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setName('');
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                  isSignup
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('login.requestAccess')}
              </button>
            </div>

            {/* Status Messages */}
            <AnimatePresence mode="wait">
              {formError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{formError}</p>
                </motion.div>
              )}
              {formSuccess && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-400">{formSuccess}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white hover:bg-slate-50 text-slate-900 border-0 rounded-xl font-medium shadow-lg mb-6"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t('login.continueWithGoogle')}
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {t('login.orContinueWithEmail')}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignup && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name" className="text-slate-400 text-sm">
                      {t('login.fullName')}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setFormError(null); }}
                        placeholder={t('login.enterFullName')}
                        disabled={loading}
                        className="h-12 pl-11 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-400 text-sm">
                  {t('login.emailAddress')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                    placeholder={t('login.enterEmail')}
                    disabled={loading}
                    className="h-12 pl-11 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-400 text-sm">
                  {t('login.password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
                    placeholder={t('login.enterPassword')}
                    disabled={loading}
                    className={`h-12 pl-11 bg-white/[0.03] text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20 ${
                      passwordTooShort ? 'border-amber-500/50' : 'border-white/10'
                    }`}
                  />
                </div>
                {passwordTooShort && (
                  <p className="text-xs text-amber-400">{t('login.weakPassword')}</p>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isSignup && (
                  <motion.div
                    key="confirm-password-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="confirmPassword" className="text-slate-400 text-sm">
                      {t('login.confirmPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFormError(null); }}
                        placeholder={t('login.confirmYourPassword')}
                        disabled={loading}
                        className={`h-12 pl-11 bg-white/[0.03] text-white placeholder:text-slate-500 rounded-xl focus:border-cyan-500/50 focus:ring-cyan-500/20 ${
                          passwordMismatch ? 'border-red-500/50' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {passwordMismatch && (
                      <p className="text-xs text-red-400">{t('login.passwordsDontMatch')}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl font-medium shadow-lg shadow-slate-700/40 mt-6"
                disabled={loading || passwordMismatch}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isSignup ? t('login.requestAccess') : t('login.signIn')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Info Text for Signup */}
            {isSignup && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-500 text-center mt-4"
              >
                {t('login.requestReview')}
              </motion.p>
            )}
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-white/25 text-xs mt-4 mb-6 font-light tracking-wide"
          >
            © 2026 Justinas Narutis. Design & Build.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
