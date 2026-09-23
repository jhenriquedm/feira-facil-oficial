import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Phone, Key, Camera, Upload, Trash2, Check, AlertCircle, 
  RefreshCw, ShieldCheck, Sparkles, LogOut, Copy, CheckCheck, Eye, EyeOff, 
  ShoppingBag, ShoppingBasket, Layers, DollarSign, Smile, Lock, Palette, CreditCard
} from 'lucide-react';
import { AuthUser } from '../useShoppingData';
import { UserProfile, Purchase, Product, Category } from '../types';
import { sanitizeAndCapitalize, formatPhone, formatCPF, isValidCPF } from '../utils/textFormatters';

interface ProfileProps {
  user: AuthUser;
  userProfile: UserProfile | null;
  updateUserProfileData: (data: {
    name?: string;
    phone?: string;
    photoURL?: string | null;
    bio?: string;
    color?: string;
    cpf?: string;
  }) => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string, confirmPassword: string, isGoogleUser?: boolean) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  isOnline: boolean;
  purchases: Purchase[];
  products: Product[];
  categories: Category[];
}

const PRESET_AVATARS = [
  { id: 'apple', emoji: '🍎', label: 'Maçã' },
  { id: 'cart', emoji: '🛒', label: 'Carrinho' },
  { id: 'avocado', emoji: '🥑', label: 'Abacate' },
  { id: 'broccoli', emoji: '🥦', label: 'Brócolis' },
  { id: 'cheese', emoji: '🧀', label: 'Queijo' },
  { id: 'meat', emoji: '🥩', label: 'Açougue' },
  { id: 'grapes', emoji: '🍇', label: 'Uvas' },
  { id: 'chef', emoji: '🧑‍🍳', label: 'Chef' },
  { id: 'developer', emoji: '👩‍💻', label: 'Tech' },
  { id: 'fox', emoji: '🦊', label: 'Raposa' },
  { id: 'lion', emoji: '🦁', label: 'Leão' },
  { id: 'sparkles', emoji: '✨', label: 'Estrela' },
];

const PRESET_COLORS = [
  { hex: '#0284c7', label: 'Azul Céu' },
  { hex: '#10b981', label: 'Verde Esmeralda' },
  { hex: '#8b5cf6', label: 'Roxo Violeta' },
  { hex: '#f43f5e', label: 'Rosa Framboesa' },
  { hex: '#f59e0b', label: 'Âmbar Solar' },
  { hex: '#6366f1', label: 'Índigo Moderno' },
  { hex: '#06b6d4', label: 'Ciano Tropical' },
  { hex: '#ec4899', label: 'Pink Vibrante' },
  { hex: '#334155', label: 'Ardósia Escuro' },
];

export function Profile({
  user,
  userProfile,
  updateUserProfileData,
  changeUserPassword,
  sendPasswordReset,
  sendVerificationEmail,
  logout,
  isOnline,
  purchases,
  products,
  categories
}: ProfileProps) {
  // Personal Data Form State
  const [name, setName] = useState(userProfile?.name || user.displayName || '');
  const [cpf, setCpf] = useState(userProfile?.cpf ? formatCPF(userProfile.cpf) : '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [color, setColor] = useState(userProfile?.color || '#0284c7');
  const [photoURL, setPhotoURL] = useState<string | null>(
    userProfile?.photoURL || ('photoURL' in user ? user.photoURL : null) || null
  );

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');

  const profileTimerRef = useRef<NodeJS.Timeout | null>(null);
  const passwordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const securityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Requirement: Notifications must last strictly 3 seconds
  const showProfileSuccessTimed = (msg: string) => {
    if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    setProfileSuccess(msg);
    setProfileError('');
    if (msg) profileTimerRef.current = setTimeout(() => setProfileSuccess(''), 3000);
  };

  const showProfileErrorTimed = (msg: string) => {
    if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    setProfileError(msg);
    setProfileSuccess('');
    if (msg) profileTimerRef.current = setTimeout(() => setProfileError(''), 3000);
  };

  const showPasswordSuccessTimed = (msg: string) => {
    if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    setPasswordSuccess(msg);
    setPasswordError('');
    if (msg) passwordTimerRef.current = setTimeout(() => setPasswordSuccess(''), 3000);
  };

  const showPasswordErrorTimed = (msg: string) => {
    if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    setPasswordError(msg);
    setPasswordSuccess('');
    if (msg) passwordTimerRef.current = setTimeout(() => setPasswordError(''), 3000);
  };

  const showSecurityNoticeTimed = (msg: string) => {
    if (securityTimerRef.current) clearTimeout(securityTimerRef.current);
    setSecurityNotice(msg);
    if (msg) securityTimerRef.current = setTimeout(() => setSecurityNotice(''), 3000);
  };

  useEffect(() => {
    return () => {
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      if (securityTimerRef.current) clearTimeout(securityTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || user.displayName || '');
      setCpf(userProfile.cpf ? formatCPF(userProfile.cpf) : '');
      setPhone(userProfile.phone || '');
      setBio(userProfile.bio || '');
      setColor(userProfile.color || '#0284c7');
      setPhotoURL(userProfile.photoURL || ('photoURL' in user ? user.photoURL : null) || null);
    }
  }, [userProfile, user]);

  const [copiedUid, setCopiedUid] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isGoogleUser = user && 'providerData' in user && user.providerData?.some(p => p.providerId === 'google.com');
  const isEmailVerified = user && 'emailVerified' in user ? user.emailVerified : false;

  // Format phone mask (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(sanitizeAndCapitalize(e.target.value, 40));
  };

  // Image Upload with Canvas Resizing & Compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showProfileErrorTimed('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoURL(compressedDataUrl);
          setShowAvatarPicker(false);
          showProfileSuccessTimed('Foto carregada com sucesso! Clique em "Salvar Dados Pessoais" para confirmar.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Camera integration
  const startCamera = async () => {
    setCameraActive(true);
    setShowAvatarPicker(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 320, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      showProfileErrorTimed('Não foi possível acessar a câmera do dispositivo. Verifique as permissões.');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 256, 256);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoURL(dataUrl);
      stopCamera();
      showProfileSuccessTimed('Foto capturada com sucesso! Clique em "Salvar Dados Pessoais" para salvar.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Preset Emoji Avatar generator
  const selectPresetAvatar = (emoji: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.arc(64, 64, 64, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '68px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 70);

      const avatarDataUrl = canvas.toDataURL('image/png');
      setPhotoURL(avatarDataUrl);
      setShowAvatarPicker(false);
      showProfileSuccessTimed('Avatar selecionado! Lembre-se de salvar suas alterações.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const cleanName = sanitizeAndCapitalize(name, 40);
      const cleanBio = sanitizeAndCapitalize(bio, 120);
      const cleanCpfDigits = cpf.replace(/\D/g, '');

      if (cleanCpfDigits.length > 0) {
        if (cleanCpfDigits.length !== 11 || !isValidCPF(cleanCpfDigits)) {
          showProfileErrorTimed('CPF inválido. Verifique os dígitos informados.');
          setSavingProfile(false);
          return;
        }
      }

      await updateUserProfileData({
        name: cleanName,
        phone,
        photoURL,
        bio: cleanBio,
        color,
        cpf: cleanCpfDigits || undefined
      });
      showProfileSuccessTimed('Dados do perfil salvos localmente e sincronizados com sucesso!');
    } catch (err: any) {
      console.error(err);
      showProfileErrorTimed(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showPasswordErrorTimed('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showPasswordErrorTimed('A confirmação da nova senha não confere.');
      return;
    }

    setSavingPassword(true);

    try {
      await changeUserPassword('', newPassword, confirmPassword, isGoogleUser);
      showPasswordSuccessTimed('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      showPasswordErrorTimed(err.message || 'Erro ao atualizar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      await sendPasswordReset(user.email);
      showSecurityNoticeTimed(`Instruções de redefinição de senha enviadas para "${user.email}".`);
    } catch (err: any) {
      showSecurityNoticeTimed(`Erro: ${err.message}`);
    } finally {
      setSendingReset(false);
    }
  };

  const handleSendVerification = async () => {
    setSendingVerify(true);
    try {
      await sendVerificationEmail();
      showSecurityNoticeTimed('E-mail de verificação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      showSecurityNoticeTimed(`Erro ao enviar verificação: ${err.message}`);
    } finally {
      setSendingVerify(false);
    }
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Vazia', color: 'bg-neutral-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, text: 'Fraca', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, text: 'Média', color: 'bg-amber-500' };
    return { score: 3, text: 'Forte & Segura', color: 'bg-emerald-500' };
  };

  const passStrength = getPasswordStrength(newPassword);
  const totalSpentAll = purchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 flex items-center gap-2">
            <User className="text-sky-500" style={{ color }} />
            Meu Perfil & Conta
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Gerencie seus dados pessoais, cor do perfil, segurança e preferências de acesso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              Sincronizado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200">
              <AlertCircle size={14} />
              Acesso Local
            </span>
          )}

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all border border-red-200 active:scale-95 shadow-sm"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Profile & Personal) | Right Column (Security & Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Personal Details & Avatar (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Personal Details */}
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <User size={16} className="text-sky-500" style={{ color }} />
                Dados Pessoais & Foto de Perfil
              </h2>
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Identificação</span>
            </div>

            {/* Avatar Selector and Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div 
                  className="h-24 w-24 rounded-3xl bg-neutral-100 border-2 overflow-hidden flex items-center justify-center shadow-md"
                  style={{ borderColor: color }}
                >
                  {photoURL ? (
                    <img src={photoURL} alt="Foto de Perfil" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center font-black text-3xl" style={{ color }}>
                      {name ? name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-2 -right-2 p-2 text-white rounded-2xl shadow-lg border-2 border-white transition-all active:scale-95"
                  style={{ backgroundColor: color }}
                  title="Alterar foto de perfil"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div>
                  <h3 className="text-base font-black text-neutral-900">{name || 'Usuário Sem Nome'}</h3>
                  <p className="text-xs text-neutral-400 font-medium">{user.email || 'Sem e-mail cadastrado'}</p>
                </div>

                {/* Avatar Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Upload size={13} />
                    Carregar Foto
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Camera size={13} />
                    Tirar Foto
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Smile size={13} />
                    Galeria de Avatares
                  </button>

                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoURL(null);
                        showProfileSuccessTimed('Foto removida. Salve para confirmar.');
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-xl transition-colors"
                      title="Remover foto"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Live Camera Viewfinder Modal */}
            {cameraActive && (
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Camera size={14} className="text-sky-500" />
                    Câmera em Tempo Real
                  </span>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs font-bold text-neutral-400 hover:text-neutral-700"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="relative aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-black shadow-inner">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md active:scale-95"
                    style={{ backgroundColor: color }}
                  >
                    Capturar Esta Foto
                  </button>
                </div>
              </div>
            )}

            {/* Preset Avatars Gallery Drawer */}
            {showAvatarPicker && (
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">Escolha um avatar ilustrado:</span>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(false)}
                    className="text-[11px] font-bold text-sky-600 hover:underline"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => selectPresetAvatar(av.emoji)}
                      className="p-3 bg-white hover:bg-sky-100/80 border border-sky-100 rounded-2xl text-2xl transition-all hover:scale-105 shadow-sm flex flex-col items-center gap-1"
                    >
                      <span>{av.emoji}</span>
                      <span className="text-[9px] font-bold text-neutral-600">{av.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback message for Profile */}
            {profileError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-start gap-2">
                <Check size={16} className="shrink-0 mt-0.5" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {/* Personal Details Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Nome Completo</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={handleNameChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Phone / WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700">E-mail Cadastrado</label>
                    {isEmailVerified ? (
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <ShieldCheck size={12} /> Verificado
                      </span>
                    ) : (
                      isGoogleUser && (
                        <button
                          type="button"
                          onClick={handleSendVerification}
                          disabled={sendingVerify || !isOnline}
                          className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5"
                        >
                          {sendingVerify ? 'Enviando...' : 'Verificar E-mail'}
                        </button>
                      )
                    )}
                  </div>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      disabled
                      value={user.email || userProfile?.email || ''}
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* CPF Editable with Real-Time Validation */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700">CPF</label>
                    {cpf.replace(/\D/g, '').length > 0 && (
                      cpf.replace(/\D/g, '').length === 11 ? (
                        isValidCPF(cpf.replace(/\D/g, '')) ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck size={12} /> CPF Válido
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
                    <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Color Selection Field */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                  <Palette size={15} style={{ color }} />
                  Cor do Perfil & Tema do Aplicativo
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`h-7 w-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-xs ${
                        color === c.hex ? 'ring-2 ring-offset-2 ring-neutral-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {color === c.hex && <Check size={13} className="text-white drop-shadow" />}
                    </button>
                  ))}

                  {/* Custom color input */}
                  <div className="flex items-center gap-1 ml-2 bg-neutral-50 px-2 py-1 rounded-xl border border-neutral-200">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Escolher cor personalizada"
                    />
                    <span className="text-[11px] font-mono font-bold text-neutral-600 uppercase">{color}</span>
                  </div>
                </div>
              </div>

              {/* Bio / Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-700">Notas Pessoais ou Preferências de Compras</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Foco em economia mensal para família, compras de hortifruti na feira de quarta-feira..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                />
              </div>

              {/* Submit Profile */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-2"
                  style={{ backgroundColor: color }}
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Salvando Dados...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Salvar Dados Pessoais
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Security, Password & Stats (Span 1) */}
        <div className="space-y-6">
          {/* Card: Password & Security (Gestão Financeira Model) */}
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <Lock size={16} className="text-sky-500" style={{ color }} />
                Segurança & Senha
              </h2>
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Acesso</span>
            </div>

            <div className="space-y-4">
              {isGoogleUser && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2 text-xs text-sky-900">
                  <span className="font-extrabold flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-sky-600" />
                    Autenticação Google Ativa
                  </span>
                  <p className="text-[11px] text-sky-800 leading-relaxed text-justify">
                    Sua conta está conectada através do Google. Sua segurança e senha são protegidas diretamente pela sua conta Google. Você pode definir uma nova senha abaixo para habilitar o login por e-mail/senha.
                  </p>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-start gap-1.5">
                  <Check size={14} className="shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {securityNotice && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-800 flex items-start gap-1.5">
                  <Sparkles size={14} className="shrink-0 mt-0.5" />
                  <span>{securityNotice}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-3">
                {/* New password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">
                    {isGoogleUser ? 'Definir Nova Senha (Mín. 6 caracteres)' : 'Nova Senha (Mín. 6 caracteres)'}
                  </label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-neutral-400">Força da senha:</span>
                        <span className={passStrength.score === 1 ? 'text-red-500' : passStrength.score === 2 ? 'text-amber-500' : 'text-emerald-600'}>
                          {passStrength.text}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passStrength.color} transition-all duration-300`}
                          style={{ width: `${(passStrength.score / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      {isGoogleUser ? 'Definindo Senha...' : 'Atualizando Senha...'}
                    </>
                  ) : (
                    <>
                      <Key size={13} />
                      {isGoogleUser ? 'Definir Senha de Acesso' : 'Alterar Senha de Acesso'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
