import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Mail, User, Check, AlertCircle, RefreshCw, Key, 
  Eye, EyeOff, ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, 
  CreditCard, Search
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { sanitizeAndCapitalize, formatCPF, isValidCPF } from '../utils/textFormatters';
import { APP_VERSION_INFO } from '../version';

interface AuthGateProps {
  loginWithEmail: (identifier: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string, confirmPassword: string, cpf?: string) => Promise<void>;
  findUserForRecovery: (identifier: string) => Promise<{ id: string; name: string; email: string; cpf?: string }>;
  resetPasswordDirect: (userId: string, newPass: string, confirmPass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  clearLocalStorage?: () => void;
  isOnline: boolean;
}

export function AuthGate({
  loginWithEmail,
  registerWithEmail,
  findUserForRecovery,
  resetPasswordDirect,
  loginWithGoogle,
  clearLocalStorage,
  isOnline
}: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgotPassword'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email or CPF for login
  const [email, setEmail] = useState(''); // For registration
  const [cpf, setCpf] = useState(''); // For registration & recovery
  const [recoveryIdentifier, setRecoveryIdentifier] = useState(''); // Email or CPF for recovery
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Recovery Step 2 (Direct Reset Modal / View)
  const [identifiedUser, setIdentifiedUser] = useState<{ id: string; name: string; email: string; cpf?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Requirement: Every error, warning, or success message MUST last ONLY 3 seconds and then disappear
  const showTimedNotification = (message: string, isError = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isError) {
      setErrorMsg(message);
      setSuccessMsg('');
    } else {
      setSuccessMsg(message);
      setErrorMsg('');
    }

    timerRef.current = setTimeout(() => {
      setErrorMsg('');
      setSuccessMsg('');
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(sanitizeAndCapitalize(e.target.value, 40));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleRecoveryIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If typing digits, format as CPF, else allow email
    if (/^\d+$/.test(val.replace(/[\.\-]/g, '')) && val.replace(/[\.\-]/g, '').length <= 11) {
      setRecoveryIdentifier(formatCPF(val));
    } else {
      setRecoveryIdentifier(val.slice(0, 50));
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = identifier.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showTimedNotification('Informe um endereço de e-mail válido.', true);
      return;
    }
    if (!password) {
      showTimedNotification('Informe sua senha de acesso.', true);
      return;
    }
    if (password.length < 6) {
      showTimedNotification('A senha deve conter no mínimo 6 caracteres.', true);
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(cleanEmail, password);
    } catch (err: any) {
      showTimedNotification(err.message || 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.', true);
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || name.length < 2) {
      showTimedNotification('O nome deve possuir entre 2 e 40 caracteres.', true);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showTimedNotification('Informe um endereço de e-mail válido.', true);
      return;
    }
    if (cpf) {
      const cleanDigits = cpf.replace(/\D/g, '');
      if (cleanDigits.length !== 11 || !isValidCPF(cleanDigits)) {
        showTimedNotification('CPF inválido. Verifique os dígitos informados.', true);
        return;
      }
    }
    if (!password || password.length < 6) {
      showTimedNotification('A senha deve conter no mínimo 6 caracteres.', true);
      return;
    }
    if (password !== confirmPassword) {
      showTimedNotification('A confirmação da senha não confere.', true);
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(name, email, password, confirmPassword, cpf);
      showTimedNotification('Conta criada com sucesso! Acessando o sistema...');
    } catch (err: any) {
      showTimedNotification(err.message || 'Erro ao realizar cadastro.', true);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Find User for Password Recovery
  const handleIdentifyUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryIdentifier.trim()) {
      showTimedNotification('Digite seu e-mail ou CPF cadastrado.', true);
      return;
    }

    setLoading(true);
    try {
      const user = await findUserForRecovery(recoveryIdentifier);
      setIdentifiedUser(user);
      showTimedNotification(`Usuário localizado: ${user.name}`);
    } catch (err: any) {
      showTimedNotification(err.message || 'Nenhum usuário localizado com esses dados.', true);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password Directly & Log In
  const handleDirectPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifiedUser) return;

    if (!newPassword || newPassword.length < 6) {
      showTimedNotification('A nova senha deve possuir no mínimo 6 caracteres.', true);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showTimedNotification('A confirmação da nova senha não confere.', true);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordDirect(identifiedUser.id, newPassword, confirmNewPassword);
      showTimedNotification('Senha redefinida com sucesso! Entrando...');
      // Direct access after password reset
      await loginWithEmail(identifiedUser.email, newPassword);
    } catch (err: any) {
      showTimedNotification(err.message || 'Erro ao redefinir senha.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code || err?.message || '';
      if (
        code.includes('auth/popup-closed-by-user') ||
        code.includes('auth/cancelled-popup-request') ||
        code.includes('popup-closed-by-user') ||
        code.includes('cancelled-popup-request')
      ) {
        return;
      }
      showTimedNotification(err?.message || 'Erro ao autenticar com o Google.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocalStorage = () => {
    if (clearLocalStorage) {
      clearLocalStorage();
    } else {
      localStorage.clear();
      sessionStorage.clear();
    }
    setName('');
    setIdentifier('');
    setEmail('');
    setCpf('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryIdentifier('');
    setIdentifiedUser(null);
    setErrorMsg('');
    showTimedNotification('Armazenamento local limpo com sucesso! Cache resetado.');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-neutral-200/60 border border-neutral-200 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top App Logo & Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <AppLogo size={58} />
          <div>
            <h1 className="text-2xl font-black text-neutral-950 tracking-tight">Feira Fácil</h1>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
              {mode === 'login' && 'Entrar na Sua Conta'}
              {mode === 'register' && 'Criar Nova Conta'}
              {mode === 'forgotPassword' && 'Recuperação de Senha'}
            </p>
          </div>
        </div>

        {/* 3-Second Floating Notifications */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ----------------- MODE: LOGIN ----------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email Only */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Endereço de E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  maxLength={50}
                  placeholder="seu.email@exemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.trim().toLowerCase().slice(0, 50))}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700">Senha de Acesso</label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setIdentifiedUser(null);
                    setMode('forgotPassword');
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  maxLength={40}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md shadow-sky-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={15} />}
              Entrar no Feira Fácil
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-neutral-200 w-full" />
              <span className="bg-white px-3 text-[10px] uppercase tracking-wider font-bold text-neutral-400 absolute">
                ou
              </span>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || !isOnline}
              className="w-full py-2.5 bg-white hover:bg-neutral-50 disabled:opacity-50 text-neutral-700 border border-neutral-200 rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Entrar com Google
            </button>

            {/* Toggle to Register */}
            <div className="pt-2 text-center">
              <p className="text-xs text-neutral-500">
                Não possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMode('register');
                  }}
                  className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Cadastre-se grátis
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- MODE: REGISTER ----------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  required
                  maxLength={40}
                  placeholder="Seu Nome Completo"
                  value={name}
                  onChange={handleNameChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700">CPF (Opcional para Recuperação)</label>
                {cpf.replace(/\D/g, '').length > 0 && (
                  cpf.replace(/\D/g, '').length === 11 ? (
                    isValidCPF(cpf.replace(/\D/g, '')) ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> CPF Válido
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} /> CPF Inválido
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                      <AlertCircle size={12} /> {cpf.replace(/\D/g, '').length}/11 dígitos
                    </span>
                  )
                )}
              </div>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Endereço de E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  maxLength={50}
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().toLowerCase().slice(0, 50))}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Senha de Acesso (Mín. 6 caracteres)</label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  maxLength={40}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700">Confirmar Senha</label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  maxLength={40}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Register */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md shadow-sky-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <User size={15} />}
              Cadastrar Nova Conta
            </button>

            {/* Back to Login */}
            <div className="pt-2 text-center">
              <p className="text-xs text-neutral-500">
                Já possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMode('login');
                  }}
                  className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Fazer login
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ----------------- MODE: FORGOT PASSWORD (GESTÃO FINANCEIRA PATTERN) ----------------- */}
        {mode === 'forgotPassword' && (
          <div className="space-y-4">
            {!identifiedUser ? (
              /* STEP 1: Search by Email or CPF */
              <form onSubmit={handleIdentifyUserSubmit} className="space-y-4">
                <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-1 text-xs text-sky-900">
                  <span className="font-extrabold flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-sky-600" />
                    Validação Direta de Conta
                  </span>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    Informe seu CPF ou E-mail para localizar seu cadastro. Em seguida, você poderá cadastrar sua nova senha na hora.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">CPF ou E-mail Cadastrado</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00 ou seu.email@exemplo.com"
                      value={recoveryIdentifier}
                      onChange={handleRecoveryIdentifierChange}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md shadow-sky-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={15} />}
                  Identificar Minha Conta
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setSuccessMsg('');
                      setMode('login');
                    }}
                    className="text-xs font-bold text-neutral-500 hover:text-neutral-800 flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft size={14} />
                    Voltar ao Login
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: User Identified -> Direct Password Reset Form */
              <form onSubmit={handleDirectPasswordResetSubmit} className="space-y-4 animate-in fade-in">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-900">
                  <span className="font-black flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Conta Localizada com Sucesso!
                  </span>
                  <p className="text-[11px] text-emerald-800 font-bold">
                    {identifiedUser.name} <span className="font-normal text-emerald-700">({identifiedUser.email})</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Digite a nova senha abaixo para redefinir seu acesso imediatamente.
                  </p>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Nova Senha (Mín. 6 caracteres)</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      maxLength={40}
                      placeholder="Digite a nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      maxLength={40}
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  Salvar Nova Senha & Entrar
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setIdentifiedUser(null)}
                    className="text-xs font-bold text-neutral-500 hover:text-neutral-800"
                  >
                    Trocar usuário ou voltar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* App Version Info */}
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-semibold text-sky-100 border border-white/15">
            Feira Fácil • v{APP_VERSION_INFO.version} (Build {APP_VERSION_INFO.buildNumber})
          </span>
        </div>
      </div>
    </div>
  );
}
