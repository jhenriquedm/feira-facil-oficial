import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  signInWithCredential
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Category, Product, Purchase, PurchaseItem, UserProfile } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from './defaultData';
import { isValidCPF } from './utils/textFormatters';
import { normalizeBrand, isProductDuplicate } from './utils/brand';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export interface OfflineUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isOffline: boolean;
}

export type AuthUser = User | OfflineUser;

export function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function useShoppingData() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const listenersCleanupRef = useRef<(() => void) | null>(null);

  const cleanupActiveListeners = useCallback(() => {
    if (listenersCleanupRef.current) {
      try {
        listenersCleanupRef.current();
      } catch (err) {
        console.warn("Error cleaning up previous listeners:", err);
      }
      listenersCleanupRef.current = null;
    }
  }, []);
  
  // App States
  const [categories, setCategories] = useState<Category[]>(() => DEFAULT_CATEGORIES('guest'));
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<Record<string, PurchaseItem[]>>({});
  
  // UI Preferences
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('feira_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('feira_theme_color') || '#0ea5e9'; // default sky-500
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync theme mode & dynamic theme color variables
  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('feira_theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('feira_theme_color', themeColor);
    document.documentElement.style.setProperty('--theme-primary', themeColor);
  }, [themeColor]);

  // Save/Load user-isolated local data
  const saveUserData = (key: string, data: any, userId: string) => {
    localStorage.setItem(`feira_user_${userId}_${key}`, JSON.stringify(data));
  };

  const loadUserData = <T = any>(key: string, defaultValue: T, userId: string): T => {
    const saved = localStorage.getItem(`feira_user_${userId}_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  // Helper to batch-write products to Firestore without exceeding operation limits
  const seedProductsInFirestore = async (uid: string, prods: Product[]) => {
    const CHUNK_SIZE = 250;
    for (let i = 0; i < prods.length; i += CHUNK_SIZE) {
      const batch = writeBatch(db);
      const chunk = prods.slice(i, i + CHUNK_SIZE);
      chunk.forEach((prod) => {
        const prodRef = doc(db, 'users', uid, 'products', prod.id);
        batch.set(prodRef, {
          ...prod,
          userId: uid,
          createdAt: prod.createdAt || new Date().toISOString(),
          updatedAt: prod.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
    }
  };

  // Auth monitoring & data loading
  useEffect(() => {
    // Helper to load offline session data
    const loadSessionOffline = () => {
      const activeSession = localStorage.getItem('feira_active_offline_session');
      if (activeSession) {
        try {
          const parsed = JSON.parse(activeSession);
          setUser(parsed);
          
          // Load offline data for this user
          let localCats = loadUserData<Category[]>('categories', [], parsed.uid);
          if (!localCats || localCats.length === 0) {
            localCats = DEFAULT_CATEGORIES(parsed.uid);
            saveUserData('categories', localCats, parsed.uid);
          }
          let localProds = loadUserData<Product[]>('products', [], parsed.uid);
          const isProdsInit = localStorage.getItem(`feira_products_initialized_${parsed.uid}`);
          if (!isProdsInit && (!localProds || localProds.length === 0)) {
            localProds = DEFAULT_PRODUCTS(parsed.uid);
            saveUserData('products', localProds, parsed.uid);
            localStorage.setItem(`feira_products_initialized_${parsed.uid}`, 'true');
          }
          const localPurchases = loadUserData<Purchase[]>('purchases', [], parsed.uid);
          const localItems = loadUserData<Record<string, PurchaseItem[]>>('purchase_items', {}, parsed.uid);
          const localProfile = loadUserData('user_profile', {
            id: parsed.uid,
            name: parsed.displayName || 'Usuário',
            email: parsed.email || '',
            photoURL: parsed.photoURL,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, parsed.uid);

          setCategories(localCats);
          setProducts(localProds);
          setPurchases(localPurchases);
          setPurchaseItems(localItems);
          setUserProfile(localProfile);
          setLoading(false);
          return true;
        } catch (err) {
          console.warn("Failed to parse local offline session:", err);
        }
      }
      return false;
    };

    // If offline, load offline session immediately and do not listen to Firebase Auth
    if (!isOnline) {
      const loaded = loadSessionOffline();
      if (!loaded) {
        setUser(null);
        setUserProfile(null);
        let defaultCats = loadUserData<Category[]>('categories', [], 'guest');
        if (!defaultCats || defaultCats.length === 0) {
          defaultCats = DEFAULT_CATEGORIES('guest');
          saveUserData('categories', defaultCats, 'guest');
        }
        let defaultProds = loadUserData<Product[]>('products', [], 'guest');
        const initialized = localStorage.getItem('feira_products_initialized_guest');
        if (!initialized && (!defaultProds || defaultProds.length === 0)) {
          defaultProds = DEFAULT_PRODUCTS('guest');
          saveUserData('products', defaultProds, 'guest');
          localStorage.setItem('feira_products_initialized_guest', 'true');
        }
        setCategories(defaultCats);
        setProducts(defaultProds);
        setPurchases([]);
        setPurchaseItems({});
        setLoading(false);
      }
      return;
    }

    // If online, subscribe to Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupActiveListeners();
      
      if (firebaseUser) {
        // Clear active custom offline session if it doesn't match the firebaseUser UID to prevent mixups
        const activeSession = localStorage.getItem('feira_active_offline_session');
        if (activeSession) {
          try {
            const parsed = JSON.parse(activeSession);
            if (parsed.uid !== firebaseUser.uid) {
              localStorage.removeItem('feira_active_offline_session');
            }
          } catch (_) {
            localStorage.removeItem('feira_active_offline_session');
          }
        }

        setUser(firebaseUser);
        setLoading(true);
        const uid = firebaseUser.uid;

        // Save session locally to enable offline mode
        localStorage.setItem('feira_offline_session', JSON.stringify({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          photoURL: firebaseUser.photoURL || undefined,
          canUseOffline: true
        }));

        // 0. Listen for User Profile Document in Firestore /users/{uid}
        const userDocRef = doc(db, 'users', uid);
        const unsubProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            const localUser = getLocalUsers().find(u => u.id === uid || (firebaseUser.email && u.email?.toLowerCase() === firebaseUser.email.toLowerCase()));
            const cachedProfile = loadUserData<UserProfile | null>('user_profile', null, uid);

            if (docSnap.exists()) {
              const profileData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
              const mergedProfile: UserProfile = {
                ...profileData,
                cpf: profileData.cpf || localUser?.cpf || cachedProfile?.cpf || undefined,
                phone: profileData.phone || localUser?.phone || cachedProfile?.phone || undefined,
                bio: profileData.bio || localUser?.bio || cachedProfile?.bio || undefined,
                color: profileData.color || localUser?.color || cachedProfile?.color || '#0284c7'
              };
              setUserProfile(mergedProfile);
              saveUserData('user_profile', mergedProfile, uid);

              // If Firestore was missing CPF but local had it, sync to Firestore
              if (!profileData.cpf && mergedProfile.cpf) {
                setDoc(userDocRef, { cpf: mergedProfile.cpf, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => {
                  console.warn("Could not sync local CPF to Firestore:", err);
                });
              }
            } else {
              const fallbackProfile: UserProfile = {
                id: uid,
                name: localUser?.name || cachedProfile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                email: localUser?.email || cachedProfile?.email || firebaseUser.email || '',
                cpf: localUser?.cpf || cachedProfile?.cpf || undefined,
                phone: localUser?.phone || cachedProfile?.phone || undefined,
                photoURL: localUser?.photoURL || cachedProfile?.photoURL || firebaseUser.photoURL || undefined,
                bio: localUser?.bio || cachedProfile?.bio || undefined,
                color: localUser?.color || cachedProfile?.color || '#0284c7',
                passwordHash: localUser?.passwordHash || cachedProfile?.passwordHash || undefined,
                createdAt: localUser?.createdAt || cachedProfile?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              setUserProfile(fallbackProfile);
              saveUserData('user_profile', fallbackProfile, uid);

              // Auto-seed this complete profile to Firestore immediately
              setDoc(userDocRef, cleanPayload(fallbackProfile), { merge: true }).catch(err => {
                console.warn("Could not auto-seed profile to Firestore:", err);
              });
            }
          },
          (error) => {
            console.warn('Profile onSnapshot error:', error);
          }
        );

        // 1. Listen for categories in CASCADE subcollection: /users/{uid}/categories
        const userCategoriesRef = collection(db, 'users', uid, 'categories');
        const unsubCategories = onSnapshot(
          userCategoriesRef, 
          async (snapshot) => {
            if (snapshot.empty) {
              // Migration check: verify if user has legacy categories in root /categories
              try {
                const legacyQuery = query(collection(db, 'categories'), where('userId', '==', uid));
                const legacySnap = await getDocs(legacyQuery);
                if (!legacySnap.empty) {
                  const batch = writeBatch(db);
                  const migratedCats: Category[] = [];
                  legacySnap.forEach((d) => {
                    const data = d.data() as Category;
                    batch.set(doc(db, 'users', uid, 'categories', d.id), data);
                    migratedCats.push({ ...data, id: d.id });
                  });
                  await batch.commit();
                  migratedCats.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
                  setCategories(migratedCats);
                  saveUserData('categories', migratedCats, uid);
                  return;
                }
              } catch (migErr) {
                console.warn("Legacy category migration check skipped:", migErr);
              }

              const defaultCats = DEFAULT_CATEGORIES(uid);
              setCategories(defaultCats);
              saveUserData('categories', defaultCats, uid);
              try {
                const batch = writeBatch(db);
                defaultCats.forEach((cat) => {
                  const catRef = doc(db, 'users', uid, 'categories', cat.id);
                  batch.set(catRef, cat);
                });
                await batch.commit();
              } catch (err) {
                console.warn("Auto-seeding default categories notice:", err);
              }
            } else {
              const cats: Category[] = [];
              snapshot.forEach((doc) => cats.push({ ...doc.data(), id: doc.id } as Category));
              cats.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
              setCategories(cats);
              saveUserData('categories', cats, uid);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${uid}/categories`);
          }
        );

        // 2. Listen for products in CASCADE subcollection: /users/{uid}/products
        const userProductsRef = collection(db, 'users', uid, 'products');
        const unsubProducts = onSnapshot(
          userProductsRef, 
          async (snapshot) => {
            if (snapshot.empty) {
              // Migration check: check legacy root /products
              try {
                const legacySnap = await getDocs(query(collection(db, 'products'), where('userId', '==', uid)));
                if (!legacySnap.empty) {
                  const batch = writeBatch(db);
                  const migratedProds: Product[] = [];
                  legacySnap.forEach((d) => {
                    const data = d.data() as Product;
                    batch.set(doc(db, 'users', uid, 'products', d.id), data);
                    migratedProds.push({ ...data, id: d.id });
                  });
                  await batch.commit();
                  migratedProds.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
                  setProducts(migratedProds);
                  saveUserData('products', migratedProds, uid);
                  return;
                }
              } catch (migErr) {
                console.warn("Legacy products migration check skipped:", migErr);
              }

              // Check if user has had products seeded before:
              let profileData: UserProfile | undefined;
              try {
                const uDoc = await getDoc(userDocRef);
                if (uDoc.exists()) {
                  profileData = uDoc.data() as UserProfile;
                }
              } catch (e) {
                console.warn("Could not check user profile productsSeeded flag:", e);
              }

              if (!profileData?.productsSeeded) {
                const defaultProds = DEFAULT_PRODUCTS(uid);
                setProducts(defaultProds);
                saveUserData('products', defaultProds, uid);
                localStorage.setItem(`feira_products_initialized_${uid}`, 'true');
                try {
                  await seedProductsInFirestore(uid, defaultProds);
                  await setDoc(userDocRef, { productsSeeded: true }, { merge: true });
                } catch (seedErr) {
                  console.warn("Auto-seeding default products notice:", seedErr);
                }
                return;
              }
            }
            const prods: Product[] = [];
            snapshot.forEach((doc) => prods.push({ ...doc.data(), id: doc.id } as Product));
            prods.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
            setProducts(prods);
            saveUserData('products', prods, uid);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${uid}/products`);
          }
        );

        // 3. Listen for purchases in CASCADE subcollection: /users/{uid}/purchases
        const itemUnsubs: Record<string, () => void> = {};
        const userPurchasesRef = collection(db, 'users', uid, 'purchases');
        const unsubPurchases = onSnapshot(
          userPurchasesRef, 
          async (snapshot) => {
            if (snapshot.empty) {
              // Migration check: check legacy root /purchases
              try {
                const legacySnap = await getDocs(query(collection(db, 'purchases'), where('userId', '==', uid)));
                if (!legacySnap.empty) {
                  const batch = writeBatch(db);
                  const migratedPurs: Purchase[] = [];
                  for (const pDoc of legacySnap.docs) {
                    const data = pDoc.data() as Purchase;
                    batch.set(doc(db, 'users', uid, 'purchases', pDoc.id), data);
                    migratedPurs.push({ ...data, id: pDoc.id });
                    const itemsSnap = await getDocs(collection(db, 'purchases', pDoc.id, 'items'));
                    itemsSnap.forEach(iDoc => {
                      batch.set(doc(db, 'users', uid, 'purchases', pDoc.id, 'items', iDoc.id), iDoc.data());
                    });
                  }
                  await batch.commit();
                  setPurchases(migratedPurs);
                  saveUserData('purchases', migratedPurs, uid);
                  return;
                }
              } catch (migErr) {
                console.warn("Legacy purchases migration check skipped:", migErr);
              }
            }

            const purs: Purchase[] = [];
            snapshot.forEach((doc) => purs.push({ id: doc.id, ...doc.data() } as Purchase));
            setPurchases(purs);
            saveUserData('purchases', purs, uid);
            
            // For each purchase, set up individual real-time listeners for items in /users/{uid}/purchases/{p.id}/items
            purs.forEach((p) => {
              if (itemUnsubs[p.id]) return; // Listener already active
              const qItems = collection(db, 'users', uid, 'purchases', p.id, 'items');
              itemUnsubs[p.id] = onSnapshot(
                qItems, 
                (itemSnapshot) => {
                  const items: PurchaseItem[] = [];
                  itemSnapshot.forEach((idoc) => items.push({ id: idoc.id, ...idoc.data() } as PurchaseItem));
                  setPurchaseItems(prev => {
                    const updated = { ...prev, [p.id]: items };
                    saveUserData('purchase_items', updated, uid);
                    return updated;
                  });
                },
                (error) => {
                  handleFirestoreError(error, OperationType.GET, `users/${uid}/purchases/${p.id}/items`);
                }
              );
            });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${uid}/purchases`);
          }
        );

        // Store active unsubscriptions in our mutable ref so we can clean them up anytime
        listenersCleanupRef.current = () => {
          unsubProfile();
          unsubCategories();
          unsubProducts();
          unsubPurchases();
          Object.values(itemUnsubs).forEach(unsub => unsub());
        };

        setLoading(false);
      } else {
        // If there is no firebaseUser, try to fall back to the active offline custom session
        const loaded = loadSessionOffline();
        if (!loaded) {
          setUser(null);
          setUserProfile(null);
          let defaultCats = loadUserData<Category[]>('categories', [], 'guest');
          if (!defaultCats || defaultCats.length === 0) {
            defaultCats = DEFAULT_CATEGORIES('guest');
            saveUserData('categories', defaultCats, 'guest');
          }
          let defaultProds = loadUserData<Product[]>('products', [], 'guest');
          const initialized = localStorage.getItem('feira_products_initialized_guest');
          if (!initialized && (!defaultProds || defaultProds.length === 0)) {
            defaultProds = DEFAULT_PRODUCTS('guest');
            saveUserData('products', defaultProds, 'guest');
            localStorage.setItem('feira_products_initialized_guest', 'true');
          }
          setCategories(defaultCats);
          setProducts(defaultProds);
          setPurchases([]);
          setPurchaseItems({});
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupActiveListeners();
    };
  }, [isOnline, cleanupActiveListeners]);

  // --- Auth & Account Core Business Logic ---

  const validateName = (name: string): string | null => {
    if (!name || name.length < 2 || name.length > 40) {
      return "O nome deve possuir entre 2 e 40 caracteres.";
    }
    const validPattern = /^[a-zA-ZÀ-ÿ\s\-\.]+$/;
    if (!validPattern.test(name)) {
      return "O nome aceita somente letras, caracteres acentuados e espaços.";
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return "O e-mail é obrigatório.";
    const validPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validPattern.test(email)) {
      return "O e-mail precisa respeitar uma estrutura válida (usuario@dominio.com).";
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password || password.length < 6 || password.length > 40) {
      return "A senha deve possuir no mínimo 6 caracteres.";
    }
    return null;
  };

  // Helper to load/save all registered users locally
  const getLocalUsers = (): UserProfile[] => {
    try {
      const stored = localStorage.getItem('feira_users');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalUsers = (usersList: UserProfile[]) => {
    try {
      localStorage.setItem('feira_users', JSON.stringify(usersList));
    } catch (e) {
      console.error("Erro ao salvar lista local de usuários:", e);
    }
  };

  // Setup real-time listeners for authenticated or local session user
  const setupUserDataListeners = (uid: string, fallbackDisplayName?: string, fallbackEmail?: string) => {
    cleanupActiveListeners();
    
    // 0. Profile listener
    const userDocRef = doc(db, 'users', uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        const localUser = getLocalUsers().find(u => u.id === uid || (fallbackEmail && u.email?.toLowerCase() === fallbackEmail.toLowerCase()));
        const cachedProfile = loadUserData<UserProfile | null>('user_profile', null, uid);

        if (docSnap.exists()) {
          const profileData = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          const mergedProfile: UserProfile = {
            ...profileData,
            cpf: profileData.cpf || localUser?.cpf || cachedProfile?.cpf || undefined,
            phone: profileData.phone || localUser?.phone || cachedProfile?.phone || undefined,
            bio: profileData.bio || localUser?.bio || cachedProfile?.bio || undefined,
            color: profileData.color || localUser?.color || cachedProfile?.color || '#0284c7'
          };
          setUserProfile(mergedProfile);
          saveUserData('user_profile', mergedProfile, uid);

          // If Firestore is missing CPF but local has it, sync to Firestore
          if (!profileData.cpf && mergedProfile.cpf && auth.currentUser && auth.currentUser.uid === uid) {
            setDoc(userDocRef, { cpf: mergedProfile.cpf, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          }
        } else {
          const fallbackProfile: UserProfile = {
            id: uid,
            name: localUser?.name || cachedProfile?.name || fallbackDisplayName || 'Usuário',
            email: localUser?.email || cachedProfile?.email || fallbackEmail || '',
            cpf: localUser?.cpf || cachedProfile?.cpf || undefined,
            phone: localUser?.phone || cachedProfile?.phone || undefined,
            photoURL: localUser?.photoURL || cachedProfile?.photoURL || undefined,
            bio: localUser?.bio || cachedProfile?.bio || undefined,
            color: localUser?.color || cachedProfile?.color || '#0284c7',
            passwordHash: localUser?.passwordHash || cachedProfile?.passwordHash || undefined,
            createdAt: localUser?.createdAt || cachedProfile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUserProfile(fallbackProfile);
          saveUserData('user_profile', fallbackProfile, uid);

          if (auth.currentUser && auth.currentUser.uid === uid) {
            setDoc(userDocRef, cleanPayload(fallbackProfile), { merge: true }).catch(() => {});
          }
        }
      },
      (error) => {
        console.warn('Profile onSnapshot fallback:', error);
      }
    );

    // 1. Categories listener in users/{uid}/categories
    const userCategoriesRef = collection(db, 'users', uid, 'categories');
    const unsubCategories = onSnapshot(
      userCategoriesRef,
      async (snapshot) => {
        if (snapshot.empty) {
          const defaultCats = DEFAULT_CATEGORIES(uid);
          setCategories(defaultCats);
          saveUserData('categories', defaultCats, uid);
          try {
            const batch = writeBatch(db);
            defaultCats.forEach((cat) => {
              const catRef = doc(db, 'users', uid, 'categories', cat.id);
              batch.set(catRef, cat);
            });
            await batch.commit();
          } catch (_) {}
        } else {
          const cats: Category[] = [];
          snapshot.forEach((d) => cats.push({ id: d.id, ...d.data() } as Category));
          cats.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
          setCategories(cats);
          saveUserData('categories', cats, uid);
        }
      },
      () => {
        const local = loadUserData('categories', DEFAULT_CATEGORIES(uid), uid);
        local.sort((a: Category, b: Category) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        setCategories(local);
      }
    );

    // 2. Products listener in users/{uid}/products
    const userProductsRef = collection(db, 'users', uid, 'products');
    const unsubProducts = onSnapshot(
      userProductsRef,
      async (snapshot) => {
        if (snapshot.empty) {
          let profileData: UserProfile | undefined;
          try {
            const uDoc = await getDoc(userDocRef);
            if (uDoc.exists()) {
              profileData = uDoc.data() as UserProfile;
            }
          } catch (_) {}

          if (!profileData?.productsSeeded) {
            const defaultProds = DEFAULT_PRODUCTS(uid);
            setProducts(defaultProds);
            saveUserData('products', defaultProds, uid);
            localStorage.setItem(`feira_products_initialized_${uid}`, 'true');
            try {
              await seedProductsInFirestore(uid, defaultProds);
              await setDoc(userDocRef, { productsSeeded: true }, { merge: true });
            } catch (seedErr) {
              console.warn("Auto-seeding products notice:", seedErr);
            }
            return;
          }
        }
        const prods: Product[] = [];
        snapshot.forEach((d) => prods.push({ id: d.id, ...d.data() } as Product));
        prods.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        setProducts(prods);
        saveUserData('products', prods, uid);
      },
      () => {
        let local = loadUserData<Product[]>('products', [], uid);
        const initialized = localStorage.getItem(`feira_products_initialized_${uid}`);
        if (!initialized && (!local || local.length === 0)) {
          local = DEFAULT_PRODUCTS(uid);
          saveUserData('products', local, uid);
          localStorage.setItem(`feira_products_initialized_${uid}`, 'true');
        }
        local.sort((a: Product, b: Product) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        setProducts(local);
      }
    );

    // 3. Purchases listener in users/{uid}/purchases
    const userPurchasesRef = collection(db, 'users', uid, 'purchases');
    const unsubPurchases = onSnapshot(
      userPurchasesRef,
      (snapshot) => {
        const purList: Purchase[] = [];
        snapshot.forEach((d) => purList.push({ id: d.id, ...d.data() } as Purchase));
        setPurchases(purList);
        saveUserData('purchases', purList, uid);
      },
      () => {
        setPurchases(loadUserData('purchases', [], uid));
      }
    );

    listenersCleanupRef.current = () => {
      unsubProfile();
      unsubCategories();
      unsubProducts();
      unsubPurchases();
    };

    return listenersCleanupRef.current;
  };

  // Register user account: Local Database first, then sync to Firebase, keeping user directly logged in
  const registerWithEmail = async (
    name: string, 
    email: string, 
    password: string, 
    confirmPassword: string,
    cpf?: string
  ): Promise<void> => {
    // 1. Validations
    const cleanedName = name.replace(/\s+/g, ' ').trim().replace(/(?:^|\s)\S/g, a => a.toUpperCase());
    const nameError = validateName(cleanedName);
    if (nameError) throw new Error(nameError);

    const cleanedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(cleanedEmail);
    if (emailError) throw new Error(emailError);

    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    if (password !== confirmPassword) {
      throw new Error("A confirmação da senha não confere.");
    }

    const cleanCpfDigits = cpf ? cpf.replace(/\D/g, '') : '';
    if (cleanCpfDigits) {
      if (cleanCpfDigits.length !== 11 || !isValidCPF(cleanCpfDigits)) {
        throw new Error("CPF inválido. Verifique os dígitos informados.");
      }
    }

    // Check if email already registered locally (only when offline)
    const existingLocal = getLocalUsers();
    if (!isOnline) {
      if (existingLocal.some(u => u.email && u.email.toLowerCase() === cleanedEmail)) {
        throw new Error("Este endereço de e-mail já está cadastrado no modo offline.");
      }
      if (cleanCpfDigits && existingLocal.some(u => u.cpf && u.cpf === cleanCpfDigits)) {
        throw new Error("Este CPF já está cadastrado em outra conta offline.");
      }
    }

    // Check if CPF is already registered in Firestore if online
    if (isOnline) {
      try {
        if (cleanCpfDigits) {
          const cpfQuery = query(collection(db, 'users'), where('cpf', '==', cleanCpfDigits));
          const cpfSnap = await getDocs(cpfQuery);
          if (!cpfSnap.empty) {
            throw new Error("Este CPF já está cadastrado em outra conta.");
          }
        }
      } catch (checkErr: any) {
        if (checkErr.message && checkErr.message.includes('já está cadastrado')) {
          throw checkErr;
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 2. Online Registration
    if (isOnline) {
      try {
        let finalUid: string;
        let activeFirebaseUser: any = null;

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
          finalUid = userCredential.user.uid;
          activeFirebaseUser = userCredential.user;
          await updateProfile(userCredential.user, { displayName: cleanedName });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            // Self-healing: If user exists in Firebase Authentication (e.g. database was wiped), try logging in with the provided password!
            try {
              const loginCredential = await signInWithEmailAndPassword(auth, cleanedEmail, password);
              finalUid = loginCredential.user.uid;
              activeFirebaseUser = loginCredential.user;
              await updateProfile(loginCredential.user, { displayName: cleanedName });
            } catch (loginErr: any) {
              throw new Error("Este endereço de e-mail já possui cadastro no Firebase Authentication. Faça login na aba 'Fazer login' com sua senha ou recupere seu acesso.");
            }
          } else {
            throw authErr;
          }
        }
        
        const finalProfile: UserProfile = {
          id: finalUid,
          name: cleanedName,
          email: cleanedEmail,
          color: '#0284c7',
          passwordHash: password,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        if (cleanCpfDigits) {
          finalProfile.cpf = cleanCpfDigits;
        }
        
        finalProfile.productsSeeded = true;
        finalProfile.categoriesSeeded = true;
        await setDoc(doc(db, 'users', finalUid), cleanPayload(finalProfile), { merge: true });
        
        // Seed the 9 default categories in user's subcollection /users/{finalUid}/categories
        const defaultCats = DEFAULT_CATEGORIES(finalUid);
        const batch = writeBatch(db);
        defaultCats.forEach((cat) => {
          const catRef = doc(db, 'users', finalUid, 'categories', cat.id);
          batch.set(catRef, {
            ...cat,
            id: cat.id,
            userId: finalUid,
            createdAt: nowIso,
            updatedAt: nowIso
          });
        });
        await batch.commit();

        // Seed the 180 predefined default products in user's subcollection /users/{finalUid}/products
        const defaultProds = DEFAULT_PRODUCTS(finalUid);
        await seedProductsInFirestore(finalUid, defaultProds);

        // Save local record with Firebase UID
        const localUpdated = [...existingLocal.filter(u => u.email !== cleanedEmail), finalProfile];
        saveLocalUsers(localUpdated);
        saveUserData('categories', defaultCats, finalUid);
        saveUserData('products', defaultProds, finalUid);
        localStorage.setItem(`feira_products_initialized_${finalUid}`, 'true');
        saveUserData('user_profile', finalProfile, finalUid);

        localStorage.setItem('feira_offline_session', JSON.stringify({
          email: cleanedEmail,
          uid: finalUid,
          displayName: cleanedName,
          canUseOffline: true
        }));

        // Update active user state
        setUser(activeFirebaseUser);
        setUserProfile(finalProfile);
        setCategories(defaultCats);
        setProducts(defaultProds);
        setThemeColor('#0284c7');
        setupUserDataListeners(finalUid, cleanedName, cleanedEmail);
      } catch (err: any) {
        if (err.code === 'auth/weak-password') {
          throw new Error("A senha informada é muito fraca. Utilize no mínimo 6 caracteres.");
        }
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
          throw new Error("O cadastro por E-mail/Senha não está ativado no Firebase Console (Menu Authentication > Sign-in method > Provedor E-mail/senha > Ativar). Ative-o para salvar contas na nuvem ou utilize 'Entrar com o Google'.");
        }

        console.error("Erro ao registrar no Firebase Auth/Firestore:", err);
        throw new Error(err.message || "Erro ao conectar com o servidor para criar sua conta.");
      }
    } else {
      // Offline-Only Registration
      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      let newProfile: UserProfile = {
        id: uid,
        name: cleanedName,
        email: cleanedEmail,
        color: '#0284c7',
        passwordHash: password,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      if (cleanCpfDigits) {
        newProfile.cpf = cleanCpfDigits;
      }

      const defaultCats = DEFAULT_CATEGORIES(uid);
      const defaultProds = DEFAULT_PRODUCTS(uid);
      const updatedLocalUsers = [...existingLocal, newProfile];
      saveLocalUsers(updatedLocalUsers);
      saveUserData('categories', defaultCats, uid);
      saveUserData('products', defaultProds, uid);
      localStorage.setItem(`feira_products_initialized_${uid}`, 'true');
      saveUserData('user_profile', newProfile, uid);

      const activeOfflineUser: OfflineUser = {
        uid,
        email: cleanedEmail,
        displayName: cleanedName,
        isOffline: true
      };
      setUser(activeOfflineUser);
      setUserProfile(newProfile);
      setCategories(defaultCats);
      setProducts(defaultProds);
      setThemeColor('#0284c7');
      localStorage.setItem('feira_active_offline_session', JSON.stringify(activeOfflineUser));
      localStorage.setItem('feira_offline_session', JSON.stringify({
        email: cleanedEmail,
        uid,
        displayName: cleanedName,
        canUseOffline: true
      }));
    }
  };

  // Login strictly with Email + Password with generic invalid credential message
  const loginWithEmail = async (emailInput: string, password: string): Promise<void> => {
    const cleanedEmail = emailInput.trim().toLowerCase();
    if (!cleanedEmail) throw new Error("Informe seu e-mail.");
    if (!password) throw new Error("Informe sua senha de acesso.");

    const emailErr = validateEmail(cleanedEmail);
    if (emailErr) {
      throw new Error("Informe um endereço de e-mail válido.");
    }

    const genericInvalidError = "E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.";

    let matchedUser: UserProfile | null = null;

    // 1. Check Local Users storage first (Instant response)
    const localUsers = getLocalUsers();
    const localMatch = localUsers.find(u => u.email && u.email.toLowerCase() === cleanedEmail);

    if (localMatch && localMatch.passwordHash === password) {
      matchedUser = localMatch;
    }

    // 2. Check Firestore /users collection if online
    if (!matchedUser && isOnline) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
          if (docData.passwordHash === password) {
            matchedUser = docData;
          }
        }
      } catch (err) {
        console.warn("Firestore user lookup error:", err);
      }
    }

    // 3. Try Firebase Auth with Email
    if (!matchedUser) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanedEmail, password);
        const firebaseUser = userCredential.user;
        
        localStorage.setItem('feira_offline_session', JSON.stringify({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          canUseOffline: true
        }));
        return;
      } catch (authErr: any) {
        // Continue to check if matchedUser was found
      }
    }

    // 4. If matched through Firestore/Local custom accounts
    if (matchedUser) {
      if (isOnline && !auth.currentUser) {
        try {
          await signInWithEmailAndPassword(auth, cleanedEmail, password);
        } catch (_) {}
      }

      const offlineUser: OfflineUser = {
        uid: matchedUser.id,
        email: matchedUser.email,
        displayName: matchedUser.name || 'Usuário',
        photoURL: matchedUser.photoURL,
        isOffline: !isOnline
      };

      setUser(offlineUser);
      setUserProfile(matchedUser);
      if (matchedUser.color) {
        setThemeColor(matchedUser.color);
      }

      saveUserData('user_profile', matchedUser, matchedUser.id);
      localStorage.setItem('feira_active_offline_session', JSON.stringify(offlineUser));
      localStorage.setItem('feira_offline_session', JSON.stringify({
        email: matchedUser.email,
        uid: matchedUser.id,
        displayName: matchedUser.name,
        photoURL: matchedUser.photoURL,
        canUseOffline: true
      }));

      // Load user data and setup listeners
      if (isOnline) {
        setupUserDataListeners(matchedUser.id, matchedUser.name, matchedUser.email);
      } else {
        let cats = loadUserData<Category[]>('categories', [], matchedUser.id);
        if (!cats || cats.length === 0) {
          cats = DEFAULT_CATEGORIES(matchedUser.id);
          saveUserData('categories', cats, matchedUser.id);
        }
        cats.sort((a: Category, b: Category) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        setCategories(cats);

        let prods = loadUserData<Product[]>('products', [], matchedUser.id);
        const initialized = localStorage.getItem(`feira_products_initialized_${matchedUser.id}`);
        if (!initialized && (!prods || prods.length === 0)) {
          prods = DEFAULT_PRODUCTS(matchedUser.id);
          saveUserData('products', prods, matchedUser.id);
          localStorage.setItem(`feira_products_initialized_${matchedUser.id}`, 'true');
        }
        prods.sort((a: Product, b: Product) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
        setProducts(prods);

        setPurchases(loadUserData('purchases', [], matchedUser.id));
        setPurchaseItems(loadUserData('purchase_items', {}, matchedUser.id));
      }
      return;
    }

    // Generic error when invalid - check if user exists in Firestore/Local to provide specific guidance
    let existingProfileForEmail: UserProfile | null = null;
    if (isOnline) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          existingProfileForEmail = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
        }
      } catch (_) {}
    }
    if (!existingProfileForEmail) {
      existingProfileForEmail = localUsers.find(u => u.email && u.email.toLowerCase() === cleanedEmail) || null;
    }

    if (existingProfileForEmail) {
      if (!existingProfileForEmail.passwordHash) {
        throw new Error("Esta conta foi criada com o Google. Clique em 'Entrar com Google' para acessar ou use 'Esqueceu a senha?' para cadastrar uma senha.");
      } else {
        throw new Error("Senha incorreta. Verifique sua senha ou clique em 'Esqueceu a senha?' para redefinir seu acesso.");
      }
    }

    throw new Error(genericInvalidError);
  };

  // Direct Password Recovery: Find user by CPF or Email
  const findUserForRecovery = async (identifier: string): Promise<{ id: string; name: string; email: string; cpf?: string }> => {
    const rawInput = identifier.trim();
    if (!rawInput) throw new Error("Informe o e-mail ou CPF para localizar sua conta.");

    const cleanedCpf = rawInput.replace(/\D/g, '');
    const cleanedEmail = rawInput.toLowerCase();
    const isCpf = cleanedCpf.length === 11;

    if (isCpf && !isValidCPF(cleanedCpf)) {
      throw new Error("CPF inválido. Verifique os dígitos informados.");
    }

    // 1. Search Local Storage
    const localUsers = getLocalUsers();
    const localMatch = localUsers.find(u => 
      (isCpf && u.cpf === cleanedCpf) || 
      (u.email && u.email.toLowerCase() === cleanedEmail)
    );

    if (localMatch) {
      return {
        id: localMatch.id,
        name: localMatch.name,
        email: localMatch.email,
        cpf: localMatch.cpf
      };
    }

    // 2. Search Firestore
    if (isOnline) {
      try {
        let q;
        if (isCpf) {
          q = query(collection(db, 'users'), where('cpf', '==', cleanedCpf));
        } else {
          q = query(collection(db, 'users'), where('email', '==', cleanedEmail));
        }
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          return {
            id: snap.docs[0].id,
            name: docData.name || 'Usuário',
            email: docData.email || '',
            cpf: docData.cpf
          };
        }
      } catch (err) {
        console.warn("Recovery search error:", err);
      }
    }

    throw new Error("Nenhum usuário localizado com o e-mail ou CPF informado.");
  };

  // Direct Password Recovery: Reset password directly without email link
  const resetPasswordDirect = async (
    userId: string, 
    newPassword: string, 
    confirmPassword: string
  ): Promise<void> => {
    if (!userId) throw new Error("ID de usuário inválido.");
    
    const passErr = validatePassword(newPassword);
    if (passErr) throw new Error(passErr);

    if (newPassword !== confirmPassword) {
      throw new Error("A nova senha e a confirmação não conferem.");
    }

    const updatedAt = new Date().toISOString();

    // 1. Update Local Storage immediately
    const localUsers = getLocalUsers();
    const updated = localUsers.map(u => {
      if (u.id === userId) {
        return { ...u, passwordHash: newPassword, updatedAt };
      }
      return u;
    });
    saveLocalUsers(updated);

    // 2. Update Firestore /users/{userId} with timeout safeguard
    if (isOnline) {
      try {
        const firestorePromise = setDoc(doc(db, 'users', userId), {
          passwordHash: newPassword,
          updatedAt
        }, { merge: true });
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
        await Promise.race([firestorePromise, timeoutPromise]);
      } catch (err) {
        console.warn("Firestore reset password fallback:", err);
      }
    }

    // 3. If user is currently signed into Firebase Auth, update it too
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        await updatePassword(auth.currentUser, newPassword);
      } catch (authPassErr) {
        console.warn("Firebase Auth updatePassword warning:", authPassErr);
      }
    }
  };

  const loginWithGoogle = async () => {
    setIsSyncing(true);
    let googleEmail: string | null = null;
    try {
      let firebaseUser: User | null = null;

      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.initialize({
            clientId: '901690992750-jbuc5p2bebr2940uaorqtn5qcp72q6cp.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: false,
          });
        } catch (initErr) {
          console.warn('GoogleAuth initialize warning:', initErr);
        }

        try {
          await GoogleAuth.signOut();
        } catch (err) {}

        let googleUser: any = null;
        try {
          googleUser = await GoogleAuth.signIn();
        } catch (nativeErr: any) {
          console.warn("Native GoogleAuth.signIn error:", nativeErr);
          const errStr = nativeErr?.message || nativeErr?.toString() || '';
          if (
            errStr.includes('12501') || 
            errStr.toLowerCase().includes('cancel') || 
            errStr.toLowerCase().includes('closed') ||
            errStr.toLowerCase().includes('user_cancelled')
          ) {
            // User intentionally dismissed the Google Account chooser
            return;
          }
          throw nativeErr;
        }

        if (googleUser) {
          googleEmail = googleUser?.email || null;
          const idToken = googleUser?.authentication?.idToken || (googleUser as any)?.idToken;
          const accessToken = googleUser?.authentication?.accessToken || (googleUser as any)?.accessToken;

          let credential: any = null;
          if (idToken) {
            credential = GoogleAuthProvider.credential(idToken);
          } else if (accessToken) {
            credential = GoogleAuthProvider.credential(null, accessToken);
          } else {
            throw new Error('Não foi possível obter o token de autenticação do Google.');
          }

          try {
            const userCredential = await signInWithCredential(auth, credential);
            firebaseUser = userCredential.user;
          } catch (credErr: any) {
            if (
              credErr.code === 'auth/account-exists-with-different-credential' ||
              credErr.code === 'auth/credential-already-in-use' ||
              credErr.code === 'auth/email-already-in-use' ||
              credErr?.message?.includes('account-exists-with-different-credential')
            ) {
              googleEmail = credErr.customData?.email || credErr.email || googleEmail;
              firebaseUser = null;
            } else {
              throw credErr;
            }
          }
        }
      } else {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          const userCredential = await signInWithPopup(auth, provider);
          firebaseUser = userCredential.user;
        } catch (popupErr: any) {
          if (
            popupErr.code === 'auth/account-exists-with-different-credential' ||
            popupErr.code === 'auth/credential-already-in-use' ||
            popupErr.code === 'auth/email-already-in-use' ||
            popupErr?.message?.includes('account-exists-with-different-credential')
          ) {
            googleEmail = popupErr.customData?.email || popupErr.email || null;
            firebaseUser = null;
          } else {
            throw popupErr;
          }
        }
      }

      // If firebaseUser is null due to account-exists-with-different-credential, attempt self-healing sign-in
      if (!firebaseUser && googleEmail) {
        const targetEmail = googleEmail.toLowerCase();
        let matchedProfile: UserProfile | null = null;

        if (isOnline) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', targetEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
              matchedProfile = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
            }
          } catch (fErr) {
            console.warn("Firestore lookup error for Google existing user:", fErr);
          }
        }

        if (!matchedProfile) {
          const localUsers = getLocalUsers();
          matchedProfile = localUsers.find(u => u.email && u.email.toLowerCase() === targetEmail) || null;
        }

        if (matchedProfile) {
          const activeUser: OfflineUser = {
            uid: matchedProfile.id,
            email: matchedProfile.email,
            displayName: matchedProfile.name || 'Usuário',
            photoURL: matchedProfile.photoURL,
            isOffline: !isOnline
          };

          setUser(activeUser);
          setUserProfile(matchedProfile);
          if (matchedProfile.color) setThemeColor(matchedProfile.color);

          saveUserData('user_profile', matchedProfile, matchedProfile.id);
          localStorage.setItem('feira_active_offline_session', JSON.stringify(activeUser));
          localStorage.setItem('feira_offline_session', JSON.stringify({
            email: matchedProfile.email,
            uid: matchedProfile.id,
            displayName: matchedProfile.name,
            photoURL: matchedProfile.photoURL,
            canUseOffline: true
          }));

          setupUserDataListeners(matchedProfile.id, matchedProfile.name, matchedProfile.email);
          return;
        } else {
          throw new Error("Sua conta já existe no Firebase cadastrada via E-mail e Senha. Entre com seu e-mail e senha no formulário ou redefina sua senha na opção 'Esqueceu a senha?'.");
        }
      }

      if (!firebaseUser) {
        throw new Error("Não foi possível concluir a autenticação com o Google.");
      }

      // Enable offline mode
      localStorage.setItem('feira_offline_session', JSON.stringify({
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        canUseOffline: true
      }));

      // Ensure user document and default categories exist in Firestore immediately
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);
        const nowIso = new Date().toISOString();
        const localUser = getLocalUsers().find(u => u.id === firebaseUser.uid || (firebaseUser.email && u.email?.toLowerCase() === firebaseUser.email.toLowerCase()));

        if (!docSnap.exists()) {
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || localUser?.name || 'Usuário Google',
            email: firebaseUser.email || localUser?.email || '',
            cpf: localUser?.cpf || undefined,
            photoURL: firebaseUser.photoURL || localUser?.photoURL || undefined,
            color: localUser?.color || '#0284c7',
            productsSeeded: true,
            categoriesSeeded: true,
            createdAt: nowIso,
            updatedAt: nowIso
          };
          await setDoc(userDocRef, cleanPayload(newProfile), { merge: true });

          const defaultCats = DEFAULT_CATEGORIES(firebaseUser.uid);
          const batch = writeBatch(db);
          defaultCats.forEach(cat => {
            const catRef = doc(db, 'users', firebaseUser.uid, 'categories', cat.id);
            batch.set(catRef, { ...cat, id: cat.id, userId: firebaseUser.uid, createdAt: nowIso, updatedAt: nowIso });
          });
          await batch.commit();

          const defaultProds = DEFAULT_PRODUCTS(firebaseUser.uid);
          await seedProductsInFirestore(firebaseUser.uid, defaultProds);

          setUserProfile(newProfile);
          saveUserData('user_profile', newProfile, firebaseUser.uid);
          saveUserData('categories', defaultCats, firebaseUser.uid);
          saveUserData('products', defaultProds, firebaseUser.uid);
          localStorage.setItem(`feira_products_initialized_${firebaseUser.uid}`, 'true');
          setCategories(defaultCats);
          setProducts(defaultProds);
        } else {
          const existingData = docSnap.data() as UserProfile;
          const mergedProfile: UserProfile = {
            ...existingData,
            name: existingData.name || firebaseUser.displayName || 'Usuário Google',
            email: existingData.email || firebaseUser.email || '',
            photoURL: existingData.photoURL || firebaseUser.photoURL || undefined,
            updatedAt: nowIso
          };
          await setDoc(userDocRef, cleanPayload(mergedProfile), { merge: true });
          setUserProfile(mergedProfile);
          saveUserData('user_profile', mergedProfile, firebaseUser.uid);
        }
      } catch (googleSyncErr) {
        console.warn("Google user Firestore init warning:", googleSyncErr);
      }
    } catch (error: any) {
      const code = error?.code || error?.message || '';
      if (
        code.includes('auth/popup-closed-by-user') ||
        code.includes('auth/cancelled-popup-request') ||
        code.includes('popup-closed-by-user') ||
        code.includes('cancelled-popup-request') ||
        code.includes('12501')
      ) {
        // User closed or dismissed Google login popup - silent return without noisy console errors
        return;
      }
      if (code.includes('auth/popup-blocked') || code.includes('popup-blocked')) {
        console.warn("Pop-up do Google bloqueado pelo navegador.");
        throw new Error("A janela de autenticação do Google foi bloqueada pelo navegador. Permita pop-ups neste site para entrar com o Google.");
      }
      console.error("Erro ao autenticar com Google:", error);
      let rawMsg = error?.message || error?.toString() || '';
      if (!rawMsg || rawMsg.includes('Something went wrong') || rawMsg.includes('DEVELOPER_ERROR') || rawMsg.includes('10') || rawMsg.includes('12500')) {
        rawMsg = "Não foi possível conectar com o Google no dispositivo. Se você já tem cadastro com este e-mail, entre informando seu e-mail e senha no formulário ou redefina seu acesso em 'Esqueceu a senha?'.";
      }
      throw new Error(rawMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    setIsSyncing(true);
    try {
      cleanupActiveListeners();
      localStorage.removeItem('feira_offline_session');
      localStorage.removeItem('feira_active_offline_session');

      if (user && !('isOffline' in user)) {
        await signOut(auth);
      }
      
      setUser(null);
      setUserProfile(null);
      setCategories([]);
      setProducts([]);
      setPurchases([]);
      setPurchaseItems({});
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // RN-AUT-015: Changing profile name only online
  const updateProfileName = async (newName: string): Promise<void> => {
    if (user && 'isOffline' in user) {
      throw new Error("Alteração do nome do perfil só pode ocorrer online.");
    }

    const cleanedName = newName.replace(/\s+/g, ' ').trim();
    const nameError = validateName(cleanedName);
    if (nameError) throw new Error(nameError);

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: cleanedName });
      setUser({ ...auth.currentUser });
    }
  };

  // Password Recovery - Send Password Reset Email
  const sendPasswordReset = async (rawEmail: string): Promise<void> => {
    const cleanedEmail = rawEmail.trim().toLowerCase();
    const emailError = validateEmail(cleanedEmail);
    if (emailError) throw new Error(emailError);

    if (!isOnline) {
      throw new Error("A recuperação de senha exige uma conexão ativa com a internet.");
    }

    try {
      await sendPasswordResetEmail(auth, cleanedEmail);
    } catch (err: any) {
      console.error("Erro ao enviar redefinição de senha:", err);
      if (err.code === 'auth/user-not-found') {
        throw new Error("Não encontramos nenhuma conta cadastrada com este endereço de e-mail.");
      } else if (err.code === 'auth/invalid-email') {
        throw new Error("O formato do e-mail informado é inválido.");
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error("Muitas tentativas em sequência. Por segurança, aguarde alguns minutos antes de tentar novamente.");
      } else if (err.code === 'auth/network-request-failed') {
        throw new Error("Falha na conexão com os servidores. Verifique sua conexão à internet.");
      }
      throw new Error(err.message || "Não foi possível enviar o e-mail de recuperação de senha.");
    }
  };

  // Update Full User Profile Data (Name, Phone, PhotoURL, Bio, Color, CPF)
  const updateUserProfileData = async (data: {
    name?: string;
    phone?: string;
    photoURL?: string | null;
    bio?: string;
    color?: string;
    cpf?: string;
  }): Promise<void> => {
    const currentUid = user ? user.uid : (userProfile ? userProfile.id : null);
    if (!currentUid) {
      throw new Error("Usuário não autenticado.");
    }

    const updates: Partial<UserProfile> = {
      updatedAt: new Date().toISOString()
    };

    if (data.name !== undefined) {
      const cleanedName = data.name.replace(/\s+/g, ' ').trim();
      const nameErr = validateName(cleanedName);
      if (nameErr) throw new Error(nameErr);
      updates.name = cleanedName;
    }

    if (data.cpf !== undefined) {
      const cleanCpfDigits = data.cpf.replace(/\D/g, '');
      if (cleanCpfDigits) {
        if (cleanCpfDigits.length !== 11 || !isValidCPF(cleanCpfDigits)) {
          throw new Error("CPF inválido. Verifique os dígitos informados.");
        }

        // Check local users for uniqueness
        const localUsers = getLocalUsers();
        const conflictLocal = localUsers.find(u => u.id !== currentUid && u.cpf === cleanCpfDigits);
        if (conflictLocal) {
          throw new Error("Este CPF já está cadastrado em outra conta.");
        }

        // Check Firestore for uniqueness if online
        if (isOnline) {
          try {
            const snap = await getDocs(query(collection(db, 'users'), where('cpf', '==', cleanCpfDigits)));
            if (!snap.empty && snap.docs.some(d => d.id !== currentUid)) {
              throw new Error("Este CPF já está cadastrado em outra conta.");
            }
          } catch (fireErr: any) {
            if (fireErr.message && fireErr.message.includes('já está cadastrado')) {
              throw fireErr;
            }
          }
        }

        updates.cpf = cleanCpfDigits;
      } else {
        updates.cpf = undefined;
      }
    }

    if (data.phone !== undefined) {
      updates.phone = data.phone.trim();
    }

    if (data.photoURL !== undefined) {
      updates.photoURL = data.photoURL || undefined;
    }

    if (data.bio !== undefined) {
      updates.bio = data.bio.trim();
    }

    if (data.color !== undefined) {
      updates.color = data.color;
      setThemeColor(data.color);
    }

    // 1. Update local storage immediately (Local-first guarantee)
    setUserProfile(prev => {
      const merged: UserProfile = {
        id: currentUid,
        name: updates.name ?? prev?.name ?? ('displayName' in (user || {}) ? (user as any).displayName : 'Usuário'),
        email: ('email' in (user || {}) ? (user as any).email : '') || prev?.email || '',
        cpf: updates.cpf !== undefined ? updates.cpf : prev?.cpf,
        phone: updates.phone !== undefined ? updates.phone : prev?.phone,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : prev?.photoURL,
        bio: updates.bio !== undefined ? updates.bio : prev?.bio,
        color: updates.color !== undefined ? updates.color : prev?.color,
        passwordHash: prev?.passwordHash,
        createdAt: prev?.createdAt ?? new Date().toISOString(),
        updatedAt: updates.updatedAt ?? new Date().toISOString()
      };
      saveUserData('user_profile', merged, currentUid);

      const localUsers = getLocalUsers();
      const idx = localUsers.findIndex(u => u.id === currentUid || (merged.email && u.email.toLowerCase() === merged.email.toLowerCase()));
      if (idx >= 0) {
        localUsers[idx] = { ...localUsers[idx], ...merged };
      } else {
        localUsers.push(merged);
      }
      saveLocalUsers(localUsers);

      return merged;
    });

    // 2. If online and Firebase Auth user exists, update auth profile (safeguarded)
    if (auth.currentUser) {
      try {
        const authProfileUpdates: { displayName?: string; photoURL?: string | null } = {};
        if (updates.name) authProfileUpdates.displayName = updates.name;
        if (data.photoURL !== undefined) authProfileUpdates.photoURL = data.photoURL;

        if (Object.keys(authProfileUpdates).length > 0) {
          const authPromise = updateProfile(auth.currentUser, authProfileUpdates);
          const timeout = new Promise(res => setTimeout(res, 2000));
          await Promise.race([authPromise, timeout]);
          setUser({ ...auth.currentUser });
        }
      } catch (authErr) {
        console.warn("Firebase Auth updateProfile notice:", authErr);
      }
    }

    // 3. Persist immediately to Firestore /users/{uid} with timeout protection
    if (isOnline) {
      try {
        const userDocRef = doc(db, 'users', currentUid);
        const firestorePromise = setDoc(userDocRef, {
          id: currentUid,
          ...updates
        }, { merge: true });
        const timeout = new Promise(res => setTimeout(res, 2500));
        await Promise.race([firestorePromise, timeout]);
      } catch (firestoreErr) {
        console.warn("Firestore user sync notice:", firestoreErr);
      }
    }
  };

  // Change Password with current password verification and local-first + cloud sync
  const changeUserPassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    isGoogleUser: boolean = false
  ): Promise<void> => {
    const currentUid = user ? user.uid : (userProfile ? userProfile.id : null);
    if (!currentUid) {
      throw new Error("Usuário não autenticado.");
    }

    // 1. Validations
    const newPassErr = validatePassword(newPassword);
    if (newPassErr) throw new Error(newPassErr);

    if (newPassword !== confirmPassword) {
      throw new Error("A nova senha e a confirmação devem ser rigorosamente idênticas.");
    }

    if (currentPassword && currentPassword === newPassword) {
      throw new Error("A nova senha precisa ser diferente da senha atual.");
    }

    const updatedAt = new Date().toISOString();

    // 2. Update local storage immediately
    const localUsers = getLocalUsers();
    const updatedUsers = localUsers.map(u => {
      if (u.id === currentUid || (userProfile?.email && u.email.toLowerCase() === userProfile.email.toLowerCase())) {
        return { ...u, passwordHash: newPassword, updatedAt };
      }
      return u;
    });
    saveLocalUsers(updatedUsers);

    if (userProfile) {
      const updatedProfile = { ...userProfile, passwordHash: newPassword, updatedAt };
      setUserProfile(updatedProfile);
      saveUserData('user_profile', updatedProfile, currentUid);
    }

    // 3. Re-authenticate (if currentPassword provided) and update Firebase Auth if online and auth user exists
    const firebaseUser = auth.currentUser;
    if (firebaseUser && firebaseUser.email && isOnline) {
      try {
        if (currentPassword && !isGoogleUser) {
          try {
            const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
          } catch (reauthErr: any) {
            console.warn("Reauth note:", reauthErr);
          }
        }
        await updatePassword(firebaseUser, newPassword);
      } catch (err: any) {
        console.warn("Firebase updatePassword note:", err.message);
      }
    }

    // 4. Update Firestore /users/{uid}
    if (isOnline) {
      try {
        await setDoc(doc(db, 'users', currentUid), {
          passwordHash: newPassword,
          updatedAt
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore password update note:", err);
      }
    }
  };

  // Send Email Verification
  const sendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado.");
    }
    await sendEmailVerification(auth.currentUser);
  };

  // Seeding Default Data
  const seedDefaults = useCallback(async () => {
    const uid = user ? user.uid : 'guest';
    const defaultCats = DEFAULT_CATEGORIES(uid);
    const defaultProds = DEFAULT_PRODUCTS(uid);

    if (user && !('isOffline' in user)) {
      setIsSyncing(true);
      try {
        const batch = writeBatch(db);
        defaultCats.forEach((cat) => {
          const ref = doc(db, 'users', uid, 'categories', cat.id);
          batch.set(ref, cat);
        });
        await batch.commit();

        await seedProductsInFirestore(uid, defaultProds);
        await setDoc(doc(db, 'users', uid), { productsSeeded: true }, { merge: true });

        setCategories(defaultCats);
        setProducts(defaultProds);
        saveUserData('categories', defaultCats, uid);
        saveUserData('products', defaultProds, uid);
        localStorage.setItem(`feira_products_initialized_${uid}`, 'true');
      } catch (error) {
        console.error("Erro ao semear dados no Firestore:", error);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    } else if (user) {
      // Offline mode seeding
      setCategories(defaultCats);
      setProducts(defaultProds);
      saveUserData('categories', defaultCats, user.uid);
      saveUserData('products', defaultProds, user.uid);
      localStorage.setItem(`feira_products_initialized_${user.uid}`, 'true');
    } else {
      // Guest mode seeding
      setCategories(defaultCats);
      setProducts(defaultProds);
      saveUserData('categories', defaultCats, 'guest');
      saveUserData('products', defaultProds, 'guest');
      localStorage.setItem('feira_products_initialized_guest', 'true');
    }
  }, [user]);

  // Sync Offline Data to Account
  const syncGuestDataToAccount = async () => {
    if (!user || ('isOffline' in user)) return;
    setIsSyncing(true);
    try {
      const uid = user.uid;
      const localCats = loadUserData<Category[]>('categories', [], uid);
      const localProds = loadUserData<Product[]>('products', [], uid);
      const localPurchases = loadUserData<Purchase[]>('purchases', [], uid);
      const localItems = loadUserData<Record<string, PurchaseItem[]>>('purchase_items', {}, uid);

      const batch = writeBatch(db);

      // Upload local categories to users/{uid}/categories
      localCats.forEach((cat: Category) => {
        const ref = doc(db, 'users', uid, 'categories', cat.id);
        batch.set(ref, { ...cat, userId: uid });
      });

      // Upload local products to users/{uid}/products
      localProds.forEach((prod: Product) => {
        const ref = doc(db, 'users', uid, 'products', prod.id);
        batch.set(ref, { ...prod, userId: uid });
      });

      // Upload local purchases to users/{uid}/purchases
      localPurchases.forEach((pur: Purchase) => {
        const ref = doc(db, 'users', uid, 'purchases', pur.id);
        batch.set(ref, { ...pur, userId: uid });

        const itemsList = localItems[pur.id] || [];
        itemsList.forEach((item: PurchaseItem) => {
          const itemRef = doc(db, 'users', uid, 'purchases', pur.id, 'items', item.id);
          batch.set(itemRef, item);
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Erro ao sincronizar dados locais com nuvem:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear All Data
  const clearAllData = async () => {
    const currentUid = user ? user.uid : (userProfile ? userProfile.id : null);
    if (!currentUid) return;

    setIsSyncing(true);
    try {
      // 1. Clear local state and local storage immediately (Local-first)
      setCategories([]);
      setProducts([]);
      setPurchases([]);
      setPurchaseItems({});
      localStorage.removeItem(`feira_user_${currentUid}_categories`);
      localStorage.removeItem(`feira_user_${currentUid}_products`);
      localStorage.removeItem(`feira_user_${currentUid}_purchases`);
      localStorage.removeItem(`feira_user_${currentUid}_purchase_items`);

      // 2. If online and real Firebase account, delete Firestore user subcollections
      if (user && !('isOffline' in user) && isOnline) {
        const catSnap = await getDocs(collection(db, 'users', currentUid, 'categories'));
        const prodSnap = await getDocs(collection(db, 'users', currentUid, 'products'));
        const purSnap = await getDocs(collection(db, 'users', currentUid, 'purchases'));

        const batch = writeBatch(db);
        catSnap.forEach(d => batch.delete(d.ref));
        prodSnap.forEach(d => batch.delete(d.ref));
        
        for (const pDoc of purSnap.docs) {
          try {
            const itemsSnap = await getDocs(collection(db, 'users', currentUid, 'purchases', pDoc.id, 'items'));
            itemsSnap.forEach(iDoc => batch.delete(iDoc.ref));
          } catch (itemErr) {
            console.warn("Error deleting subcollection items for", pDoc.id, itemErr);
          }
          batch.delete(pDoc.ref);
        }

        await batch.commit();
      }
    } catch (error) {
      console.error("Erro ao deletar dados:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Import JSON Backup
  const importBackup = async (data: {
    categories?: Category[];
    products?: Product[];
    purchases?: Purchase[];
    purchaseItems?: Record<string, PurchaseItem[]>;
    userProfile?: Partial<UserProfile> | null;
    preferences?: {
      defaultMarket?: string;
      defaultPurchaseType?: string;
      autoBarcodeScan?: boolean;
      themeMode?: 'light' | 'dark' | 'system';
      themeColor?: string;
    };
  }) => {
    const uid = user ? user.uid : 'guest';
    const newCats = data.categories || [];
    const newProds = data.products || [];
    const newPurs = data.purchases || [];
    const newItems = data.purchaseItems || {};

    // Restore Preferences if present in backup JSON
    if (data.preferences) {
      if (data.preferences.defaultMarket !== undefined) {
        localStorage.setItem('feira_pref_default_market', data.preferences.defaultMarket);
      }
      if (data.preferences.defaultPurchaseType !== undefined) {
        localStorage.setItem('feira_pref_default_type', data.preferences.defaultPurchaseType);
      }
      if (data.preferences.autoBarcodeScan !== undefined) {
        localStorage.setItem('feira_pref_auto_barcode', String(data.preferences.autoBarcodeScan));
      }
      if (data.preferences.themeMode) {
        const mode = data.preferences.themeMode === 'dark' ? 'dark' : 'light';
        setThemeMode(mode);
        localStorage.setItem('feira_theme', mode);
      }
      if (data.preferences.themeColor) {
        setThemeColor(data.preferences.themeColor);
        localStorage.setItem('feira_theme_color', data.preferences.themeColor);
      }
    }

    // Restore User Profile if present in backup JSON
    if (data.userProfile && userProfile) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        name: data.userProfile.name || userProfile.name,
        cpf: data.userProfile.cpf !== undefined ? data.userProfile.cpf : userProfile.cpf,
        phone: data.userProfile.phone !== undefined ? data.userProfile.phone : userProfile.phone,
        bio: data.userProfile.bio !== undefined ? data.userProfile.bio : userProfile.bio,
        color: data.userProfile.color || userProfile.color,
        photoURL: data.userProfile.photoURL !== undefined ? data.userProfile.photoURL : userProfile.photoURL,
        updatedAt: new Date().toISOString()
      };
      setUserProfile(updatedProfile);
      saveUserData('user_profile', updatedProfile, uid);

      if (user && !('isOffline' in user)) {
        try {
          await setDoc(doc(db, 'users', uid), updatedProfile, { merge: true });
        } catch (e) {
          console.warn("Erro ao restaurar perfil do usuário no Firestore:", e);
        }
      }
    }

    if (user && !('isOffline' in user)) {
      setIsSyncing(true);
      try {
        const batch = writeBatch(db);
        newCats.forEach(cat => {
          batch.set(doc(db, 'users', uid, 'categories', cat.id), { ...cat, userId: uid });
        });
        newProds.forEach(prod => {
          batch.set(doc(db, 'users', uid, 'products', prod.id), { ...prod, userId: uid });
        });
        newPurs.forEach(pur => {
          batch.set(doc(db, 'users', uid, 'purchases', pur.id), { ...pur, userId: uid });
          const items = newItems[pur.id] || [];
          items.forEach(item => {
            batch.set(doc(db, 'users', uid, 'purchases', pur.id, 'items', item.id), item);
          });
        });
        await batch.commit();
      } catch (err) {
        console.error("Erro ao importar backup no Firestore:", err);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else if (user) {
      if (newCats.length > 0) {
        setCategories(newCats);
        saveUserData('categories', newCats, user.uid);
      }
      if (newProds.length > 0) {
        setProducts(newProds);
        saveUserData('products', newProds, user.uid);
      }
      if (newPurs.length > 0) {
        setPurchases(newPurs);
        saveUserData('purchases', newPurs, user.uid);
      }
      if (Object.keys(newItems).length > 0) {
        setPurchaseItems(newItems);
        saveUserData('purchase_items', newItems, user.uid);
      }
    }
  };

  // --- Category CRUD ---
  const addCategory = async (name: string, iconName: string): Promise<Category> => {
    const uid = user ? user.uid : 'guest';
    
    // Normalization & Validation (RN-CAT-001 - RN-CAT-005)
    const cleanedName = name.replace(/\s+/g, ' ').trim();
    if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 30) {
      throw new Error("O nome da categoria deve possuir entre 2 e 30 caracteres.");
    }

    // Unique category name case-insensitive
    const nameExists = categories.some(cat => cat.name.toLowerCase() === cleanedName.toLowerCase());
    if (nameExists) {
      throw new Error(`Já existe uma categoria cadastrada com o nome "${cleanedName}".`);
    }

    if (!iconName) {
      throw new Error("Selecione um ícone para identificar a categoria.");
    }

    const newCat: Category = {
      id: 'cat_' + Math.random().toString(36).substring(2, 11),
      name: cleanedName,
      iconName,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: uid
    };

    if (user && !('isOffline' in user)) {
      await setDoc(doc(db, 'users', uid, 'categories', newCat.id), newCat);
    } else {
      const updated = [...categories, newCat];
      setCategories(updated);
      if (user) saveUserData('categories', updated, user.uid);
    }

    return newCat;
  };

  const updateCategory = async (id: string, name: string, iconName: string) => {
    // Normalization & Validation (RN-CAT-001 - RN-CAT-005)
    const cleanedName = name.replace(/\s+/g, ' ').trim();
    if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 30) {
      throw new Error("O nome da categoria deve possuir entre 2 e 30 caracteres.");
    }

    // Unique category name excluding current editing ID
    const nameExists = categories.some(cat => cat.id !== id && cat.name.toLowerCase() === cleanedName.toLowerCase());
    if (nameExists) {
      throw new Error(`Já existe outra categoria cadastrada com o nome "${cleanedName}".`);
    }

    if (!iconName) {
      throw new Error("Selecione um ícone para identificar a categoria.");
    }

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await updateDoc(doc(db, 'users', uid, 'categories', id), {
        name: cleanedName,
        iconName,
        updatedAt: new Date().toISOString()
      });
    } else {
      const updated = categories.map(cat => cat.id === id ? {
        ...cat, name: cleanedName, iconName, updatedAt: new Date().toISOString()
      } : cat);
      setCategories(updated);
      if (user) saveUserData('categories', updated, user.uid);
    }
  };

  const deleteCategory = async (id: string) => {
    // Block if there are products linked to this category (RN-CAT-005 / RN-CAT-006)
    const linkedProducts = products.filter(p => p.categoryId === id);
    if (linkedProducts.length > 0) {
      throw new Error(`Não é permitido excluir esta categoria pois ela possui ${linkedProducts.length} produto(s) associado(s). Remova ou reatribua os produtos antes.`);
    }

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await deleteDoc(doc(db, 'users', uid, 'categories', id));
    } else {
      const updated = categories.filter(cat => cat.id !== id);
      setCategories(updated);
      if (user) saveUserData('categories', updated, user.uid);
    }
  };

  // --- Product CRUD ---
  const addProduct = async (name: string, categoryId: string, unit: string, brand: string = '', lastPrice: number = 0, barcode: string = '') => {
    const uid = user ? user.uid : 'guest';

    // Normalization & Validation (RN-PRO-001 - RN-PRO-008)
    const cleanedName = name.replace(/\s+/g, ' ').trim();
    if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 50) {
      throw new Error("O nome do produto deve possuir entre 2 e 50 caracteres.");
    }

    const cleanedBrand = normalizeBrand(brand);
    if (cleanedBrand && cleanedBrand.length > 30) {
      throw new Error("A marca do produto não deve ultrapassar 30 caracteres.");
    }

    const cleanedBarcode = barcode ? barcode.trim().replace(/\D/g, '') : '';
    if (cleanedBarcode) {
      const barcodeExists = products.some(p => p.barcode === cleanedBarcode);
      if (barcodeExists) {
        const existing = products.find(p => p.barcode === cleanedBarcode);
        throw new Error(`O código de barras "${cleanedBarcode}" já está em uso pelo produto "${existing?.name}".`);
      }
    }

    if (!categoryId) {
      throw new Error("É obrigatório selecionar uma categoria para o produto.");
    }

    const categoryExists = categories.some(cat => cat.id === categoryId);
    if (!categoryExists) {
      throw new Error("A categoria selecionada não é válida.");
    }

    if (!unit) {
      throw new Error("A unidade de medida é obrigatória.");
    }

    if (lastPrice < 0) {
      throw new Error("O preço do produto não pode ser negativo.");
    }

    // Regra contra duplicidade:
    // Podem existir dois ou mais produtos com o mesmo nome (ex: Arroz) na mesma categoria,
    // desde que tenham marcas diferentes (nunca dois com marcas iguais),
    // ou um sem marca (nunca dois sem marca na mesma categoria).
    const duplicate = products.find(p => 
      isProductDuplicate(
        { categoryId: p.categoryId, name: p.name, brand: p.brand },
        { categoryId, name: cleanedName, brand: cleanedBrand }
      )
    );
    if (duplicate) {
      if (!cleanedBrand) {
        throw new Error(`Já existe um produto chamado "${cleanedName}" sem marca cadastrado nesta mesma categoria.`);
      } else {
        throw new Error(`Já existe um produto chamado "${cleanedName}" da marca "${cleanedBrand}" cadastrado nesta mesma categoria.`);
      }
    }

    const newProd: Product = {
      id: 'prod_' + Math.random().toString(36).substring(2, 11),
      name: cleanedName,
      categoryId,
      unit,
      brand: cleanedBrand,
      barcode: cleanedBarcode || undefined,
      lastPrice,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: uid
    };

    if (user && !('isOffline' in user)) {
      await setDoc(doc(db, 'users', uid, 'products', newProd.id), newProd);
    } else {
      const updated = [...products, newProd];
      setProducts(updated);
      if (user) saveUserData('products', updated, user.uid);
    }
    return newProd;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    // Normalization & Validation (RN-PRO-001 - RN-PRO-008)
    const cleanedName = data.name !== undefined ? data.name.replace(/\s+/g, ' ').trim() : undefined;
    if (cleanedName !== undefined && (cleanedName.length < 2 || cleanedName.length > 50)) {
      throw new Error("O nome do produto deve possuir entre 2 e 50 caracteres.");
    }

    const cleanedBrand = data.brand !== undefined ? normalizeBrand(data.brand) : undefined;
    if (cleanedBrand && cleanedBrand.length > 30) {
      throw new Error("A marca do produto não deve ultrapassar 30 caracteres.");
    }

    const cleanedBarcode = data.barcode !== undefined ? data.barcode.trim().replace(/\D/g, '') : undefined;
    if (cleanedBarcode) {
      const barcodeExists = products.some(p => p.id !== id && p.barcode === cleanedBarcode);
      if (barcodeExists) {
        const existing = products.find(p => p.id !== id && p.barcode === cleanedBarcode);
        throw new Error(`O código de barras "${cleanedBarcode}" já está em uso pelo produto "${existing?.name}".`);
      }
    }

    const targetCategoryId = data.categoryId || products.find(p => p.id === id)?.categoryId;
    if (!targetCategoryId) {
      throw new Error("Todo produto precisa pertencer a uma categoria válida.");
    }

    if (data.lastPrice !== undefined && data.lastPrice < 0) {
      throw new Error("O preço do produto não pode ser negativo.");
    }

    const existingCurrent = products.find(p => p.id === id);
    const targetName = cleanedName !== undefined ? cleanedName : existingCurrent?.name;
    const targetBrand = cleanedBrand !== undefined ? cleanedBrand : (existingCurrent?.brand || '');

    if (targetName && targetCategoryId) {
      const duplicate = products.find(p => 
        p.id !== id &&
        isProductDuplicate(
          { categoryId: p.categoryId, name: p.name, brand: p.brand },
          { categoryId: targetCategoryId, name: targetName, brand: targetBrand }
        )
      );
      if (duplicate) {
        if (!targetBrand) {
          throw new Error(`Já existe outro produto chamado "${targetName}" sem marca cadastrado nesta mesma categoria.`);
        } else {
          throw new Error(`Já existe outro produto chamado "${targetName}" da marca "${targetBrand}" cadastrado nesta mesma categoria.`);
        }
      }
    }

    const finalData = {
      ...data,
      ...(cleanedName !== undefined ? { name: cleanedName } : {}),
      ...(cleanedBrand !== undefined ? { brand: cleanedBrand } : {}),
      ...(cleanedBarcode !== undefined ? { barcode: cleanedBarcode } : {}),
    };

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await updateDoc(doc(db, 'users', uid, 'products', id), {
        ...finalData,
        updatedAt: new Date().toISOString()
      });
    } else {
      const updated = products.map(prod => prod.id === id ? {
        ...prod, ...finalData, updatedAt: new Date().toISOString()
      } : prod);
      setProducts(updated);
      if (user) saveUserData('products', updated, user.uid);
    }
  };

  const deleteProduct = async (id: string) => {
    // Block if product is used in ANY purchase list/feira (active or completed)
    const allItems = Object.values(purchaseItems).flat();
    const isUsedInAnyPurchase = allItems.some(item => item.productId === id);
    
    if (isUsedInAnyPurchase) {
      throw new Error("Não é possível excluir este produto pois ele já está sendo utilizado em uma lista/feira.");
    }

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await deleteDoc(doc(db, 'users', uid, 'products', id));
    } else {
      const updated = products.filter(prod => prod.id !== id);
      setProducts(updated);
      if (user) saveUserData('products', updated, user.uid);
    }
  };

  // --- Purchase CRUD (RN-COM-001 - RN-COM-010) ---
  const addPurchase = async (
    name: string,
    market: string,
    date: string,
    type: Purchase['type'],
    notes: string = '',
    budget?: number,
    discount?: number,
    additionalFee?: number,
    isEmptyList: boolean = false
  ) => {
    const uid = user ? user.uid : 'guest';

    // Normalization & Validation (RN-COM-001 - RN-COM-005)
    const cleanedName = name.replace(/\s+/g, ' ').trim();
    if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 50) {
      throw new Error("O nome da lista de compras deve possuir entre 2 e 50 caracteres.");
    }

    const cleanedMarket = market.replace(/\s+/g, ' ').trim();
    if (!cleanedMarket || cleanedMarket.length < 2 || cleanedMarket.length > 50) {
      throw new Error("O nome do estabelecimento/supermercado deve possuir entre 2 e 50 caracteres.");
    }

    if (!date) {
      throw new Error("A data da compra é obrigatória.");
    }

    const cleanedNotes = notes ? notes.trim() : '';
    if (cleanedNotes.length > 200) {
      throw new Error("As observações não devem ultrapassar 200 caracteres.");
    }

    if (budget !== undefined && budget < 0) {
      throw new Error("O orçamento previsto não pode ser negativo.");
    }
    if (discount !== undefined && discount < 0) {
      throw new Error("O valor de desconto/cupom não pode ser negativo.");
    }
    if (additionalFee !== undefined && additionalFee < 0) {
      throw new Error("A taxa adicional não pode ser negativa.");
    }

    const newPur: Purchase = {
      id: 'pur_' + Math.random().toString(36).substring(2, 11),
      name: cleanedName,
      market: cleanedMarket,
      date,
      type: type || 'monthly',
      notes: cleanedNotes,
      status: 'inProgress',
      total: 0,
      ...(budget !== undefined && budget > 0 ? { budget } : {}),
      ...(discount !== undefined && discount > 0 ? { discount } : {}),
      ...(additionalFee !== undefined && additionalFee > 0 ? { additionalFee } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: uid
    };

    // Populate products from catalog unless isEmptyList is true
    const initialItems: PurchaseItem[] = isEmptyList ? [] : products.map((prod) => {
      const cat = categories.find((c) => c.id === prod.categoryId);
      return {
        id: 'item_' + Math.random().toString(36).substring(2, 11),
        purchaseId: newPur.id,
        productId: prod.id,
        productName: prod.name,
        productBrand: prod.brand || '',
        categoryId: prod.categoryId,
        categoryName: cat ? cat.name : 'Geral',
        unit: prod.unit,
        quantity: 1,
        unitPrice: prod.lastPrice || 0,
        isChecked: false,
        barcode: prod.barcode || ''
      };
    });

    if (user && !('isOffline' in user)) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'purchases', newPur.id), newPur);
      initialItems.forEach((item) => {
        batch.set(doc(db, 'users', uid, 'purchases', newPur.id, 'items', item.id), item);
      });
      await batch.commit();

      const updatedPurchases = [...purchases, newPur];
      const updatedItems = { ...purchaseItems, [newPur.id]: initialItems };
      setPurchases(updatedPurchases);
      setPurchaseItems(updatedItems);
    } else {
      const updated = [...purchases, newPur];
      setPurchases(updated);
      if (user) saveUserData('purchases', updated, user.uid);
      
      const currentItems = { ...purchaseItems, [newPur.id]: initialItems };
      setPurchaseItems(currentItems);
      if (user) saveUserData('purchase_items', currentItems, user.uid);
    }
    return newPur;
  };

  const updatePurchase = async (id: string, data: Partial<Purchase>) => {
    const cleanedName = data.name !== undefined ? data.name.replace(/\s+/g, ' ').trim() : undefined;
    if (cleanedName !== undefined && (cleanedName.length < 2 || cleanedName.length > 50)) {
      throw new Error("O nome da lista de compras deve possuir entre 2 e 50 caracteres.");
    }

    const cleanedMarket = data.market !== undefined ? data.market.replace(/\s+/g, ' ').trim() : undefined;
    if (cleanedMarket !== undefined && (cleanedMarket.length < 2 || cleanedMarket.length > 50)) {
      throw new Error("O nome do estabelecimento/supermercado deve possuir entre 2 e 50 caracteres.");
    }

    const cleanedNotes = data.notes !== undefined ? data.notes.trim() : undefined;
    if (cleanedNotes !== undefined && cleanedNotes.length > 200) {
      throw new Error("As observações não devem ultrapassar 200 caracteres.");
    }

    if (data.budget !== undefined && data.budget < 0) {
      throw new Error("O orçamento previsto não pode ser negativo.");
    }
    if (data.discount !== undefined && data.discount < 0) {
      throw new Error("O valor de desconto/cupom não pode ser negativo.");
    }
    if (data.additionalFee !== undefined && data.additionalFee < 0) {
      throw new Error("A taxa adicional não pode ser negativa.");
    }

    const finalData = {
      ...data,
      ...(cleanedName !== undefined ? { name: cleanedName } : {}),
      ...(cleanedMarket !== undefined ? { market: cleanedMarket } : {}),
      ...(cleanedNotes !== undefined ? { notes: cleanedNotes } : {}),
      updatedAt: new Date().toISOString()
    };

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await updateDoc(doc(db, 'users', uid, 'purchases', id), finalData);
    } else {
      const updated = purchases.map(pur => pur.id === id ? {
        ...pur, ...finalData
      } : pur);
      setPurchases(updated);
      if (user) saveUserData('purchases', updated, user.uid);
    }
  };

  const deletePurchase = async (id: string) => {
    const existing = purchases.find(p => p.id === id);
    if (existing && existing.status === 'completed') {
      throw new Error("Listas de compras com status 'Finalizada' não podem ser excluídas.");
    }

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      // Cascade delete items in subcollection
      try {
        const itemsSnap = await getDocs(collection(db, 'users', uid, 'purchases', id, 'items'));
        const batch = writeBatch(db);
        itemsSnap.forEach(itemDoc => {
          batch.delete(itemDoc.ref);
        });
        batch.delete(doc(db, 'users', uid, 'purchases', id));
        await batch.commit();
      } catch (err) {
        console.error("Erro ao deletar compra em cascata:", err);
        await deleteDoc(doc(db, 'users', uid, 'purchases', id));
      }
    } else {
      const updated = purchases.filter(pur => pur.id !== id);
      setPurchases(updated);
      if (user) saveUserData('purchases', updated, user.uid);
      
      const updatedItems = { ...purchaseItems };
      delete updatedItems[id];
      setPurchaseItems(updatedItems);
      if (user) saveUserData('purchase_items', updatedItems, user.uid);
    }
  };

  // Duplicate / Clone Purchase with mandatory custom unique name (RN-COM-008)
  const duplicatePurchase = async (sourcePurchaseId: string, customName?: string) => {
    const source = purchases.find(p => p.id === sourcePurchaseId);
    if (!source) throw new Error("Lista de compras de origem não encontrada.");

    const uid = user ? user.uid : 'guest';
    const sourceItems = purchaseItems[sourcePurchaseId] || [];

    const newPurName = customName ? customName.replace(/\s+/g, ' ').trim() : `${source.name} (Cópia)`;
    if (!newPurName || newPurName.length < 2 || newPurName.length > 50) {
      throw new Error("O nome da lista de compras deve possuir entre 2 e 50 caracteres.");
    }

    // Ensure distinct from exact original if desired and ensure uniqueness across all purchases
    const nameExists = purchases.some(p => p.name.trim().toLowerCase() === newPurName.toLowerCase());
    if (nameExists) {
      throw new Error(`Já existe uma lista de compras cadastrada com o nome "${newPurName}". Escolha um nome exclusivo.`);
    }

    const newPur: Purchase = {
      id: 'pur_' + Math.random().toString(36).substring(2, 11),
      name: newPurName,
      market: source.market,
      date: new Date().toISOString(),
      type: source.type,
      notes: source.notes || '',
      status: 'inProgress',
      total: source.total,
      ...(source.budget ? { budget: source.budget } : {}),
      ...(source.discount ? { discount: source.discount } : {}),
      ...(source.additionalFee ? { additionalFee: source.additionalFee } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: uid
    };

    const clonedItems: PurchaseItem[] = sourceItems.map(item => ({
      ...item,
      id: 'item_' + Math.random().toString(36).substring(2, 11),
      purchaseId: newPur.id,
      isChecked: false // Reset checklist for new shopping trip
    }));

    if (user && !('isOffline' in user)) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'purchases', newPur.id), newPur);
      clonedItems.forEach(item => {
        batch.set(doc(db, 'users', uid, 'purchases', newPur.id, 'items', item.id), item);
      });
      await batch.commit();

      setPurchases(prev => [...prev, newPur]);
      setPurchaseItems(prev => ({ ...prev, [newPur.id]: clonedItems }));
    } else {
      const updatedPurchases = [...purchases, newPur];
      setPurchases(updatedPurchases);
      if (user) saveUserData('purchases', updatedPurchases, user.uid);

      const allItems = { ...purchaseItems, [newPur.id]: clonedItems };
      setPurchaseItems(allItems);
      if (user) saveUserData('purchase_items', allItems, user.uid);
    }

    return newPur;
  };

  // --- Purchase Items CRUD (RN-ITE-001 - RN-ITE-005) ---
  const addPurchaseItem = async (purchaseId: string, itemData: Omit<PurchaseItem, 'id' | 'purchaseId' | 'isChecked'>) => {
    // Validation (RN-ITE-001 - RN-ITE-002)
    if (!itemData.quantity || itemData.quantity <= 0) {
      throw new Error("A quantidade do item deve ser maior que zero.");
    }

    if (itemData.unitPrice < 0) {
      throw new Error("O preço unitário não pode ser negativo.");
    }

    const currentList = purchaseItems[purchaseId] || [];
    
    // Check for duplicate item in same purchase (RN-ITE-003)
    const existingIndex = currentList.findIndex(it => it.productId === itemData.productId);

    if (existingIndex >= 0) {
      // Item already in list: increment quantity and update price
      const existing = currentList[existingIndex];
      const newQty = existing.quantity + itemData.quantity;
      const newUnitPrice = itemData.unitPrice > 0 ? itemData.unitPrice : existing.unitPrice;
      await updatePurchaseItem(purchaseId, existing.id, {
        quantity: newQty,
        unitPrice: newUnitPrice,
        productBrand: itemData.productBrand || existing.productBrand
      });
      return;
    }

    const newItem: PurchaseItem = {
      id: 'item_' + Math.random().toString(36).substring(2, 11),
      purchaseId,
      ...itemData,
      isChecked: false
    };

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await setDoc(doc(db, 'users', uid, 'purchases', purchaseId, 'items', newItem.id), newItem);
      
      const currentPur = purchases.find(p => p.id === purchaseId);
      if (currentPur) {
        const currentList = purchaseItems[purchaseId] || [];
        const updatedList = [...currentList, newItem];
        const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        await updateDoc(doc(db, 'users', uid, 'purchases', purchaseId), {
          total: Number(newTotal.toFixed(2)),
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      const updatedList = [...currentList, newItem];
      const allItems = { ...purchaseItems, [purchaseId]: updatedList };
      setPurchaseItems(allItems);
      if (user) saveUserData('purchase_items', allItems, user.uid);
      
      const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const updatedPurchases = purchases.map(pur => pur.id === purchaseId ? {
        ...pur,
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      } : pur);
      setPurchases(updatedPurchases);
      if (user) saveUserData('purchases', updatedPurchases, user.uid);
    }
  };

  const updatePurchaseItem = async (purchaseId: string, itemId: string, data: Partial<PurchaseItem>) => {
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error("A quantidade do item deve ser maior que zero.");
    }

    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw new Error("O preço unitário não pode ser negativo.");
    }

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await updateDoc(doc(db, 'users', uid, 'purchases', purchaseId, 'items', itemId), data);
      
      const itemsList = purchaseItems[purchaseId] || [];
      const updatedList = itemsList.map(item => item.id === itemId ? { ...item, ...data } : item);
      const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      await updateDoc(doc(db, 'users', uid, 'purchases', purchaseId), {
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      });
    } else {
      const currentList = purchaseItems[purchaseId] || [];
      const updatedList = currentList.map(item => item.id === itemId ? { ...item, ...data } : item);
      const allItems = { ...purchaseItems, [purchaseId]: updatedList };
      setPurchaseItems(allItems);
      if (user) saveUserData('purchase_items', allItems, user.uid);

      const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const updatedPurchases = purchases.map(pur => pur.id === purchaseId ? {
        ...pur,
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      } : pur);
      setPurchases(updatedPurchases);
      if (user) saveUserData('purchases', updatedPurchases, user.uid);
    }
  };

  const deletePurchaseItem = async (purchaseId: string, itemId: string) => {
    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      await deleteDoc(doc(db, 'users', uid, 'purchases', purchaseId, 'items', itemId));
      
      const itemsList = purchaseItems[purchaseId] || [];
      const updatedList = itemsList.filter(item => item.id !== itemId);
      const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      await updateDoc(doc(db, 'users', uid, 'purchases', purchaseId), {
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      });
    } else {
      const currentList = purchaseItems[purchaseId] || [];
      const updatedList = currentList.filter(item => item.id !== itemId);
      const allItems = { ...purchaseItems, [purchaseId]: updatedList };
      setPurchaseItems(allItems);
      if (user) saveUserData('purchase_items', allItems, user.uid);

      const newTotal = updatedList.filter(item => item.isChecked).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const updatedPurchases = purchases.map(pur => pur.id === purchaseId ? {
        ...pur,
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      } : pur);
      setPurchases(updatedPurchases);
      if (user) saveUserData('purchases', updatedPurchases, user.uid);
    }
  };

  const toggleItemChecked = async (purchaseId: string, itemId: string, isChecked: boolean) => {
    await updatePurchaseItem(purchaseId, itemId, { isChecked });
  };

  const toggleAllItemsChecked = async (purchaseId: string, isChecked: boolean) => {
    const list = purchaseItems[purchaseId] || [];
    if (list.length === 0) return;

    const uid = user ? user.uid : 'guest';
    if (user && !('isOffline' in user)) {
      const batch = writeBatch(db);
      list.forEach(item => {
        batch.update(doc(db, 'users', uid, 'purchases', purchaseId, 'items', item.id), { isChecked });
      });
      await batch.commit();
    } else {
      const updatedList = list.map(item => ({ ...item, isChecked }));
      const allItems = { ...purchaseItems, [purchaseId]: updatedList };
      setPurchaseItems(allItems);
      if (user) saveUserData('purchase_items', allItems, user.uid);
    }
  };

  const completePurchase = async (purchaseId: string) => {
    const itemsList = purchaseItems[purchaseId] || [];
    const itemsInCart = itemsList.filter(item => item.isChecked);
    const unpurchasedItems = itemsList.filter(item => !item.isChecked);

    if (itemsInCart.length === 0) {
      throw new Error("Nenhum item foi adicionado ao carrinho. Marque ao menos um item no carrinho para finalizar a compra.");
    }

    const zeroPricedItems = itemsInCart.filter(item => !item.unitPrice || item.unitPrice <= 0);
    if (zeroPricedItems.length > 0) {
      const names = zeroPricedItems.map(i => i.productName).join(', ');
      throw new Error(`Não é possível finalizar a compra com itens zerados no carrinho: ${names}. Defina um valor maior que R$ 0,00.`);
    }

    const uid = user ? user.uid : 'guest';

    // 1. Remove items not added to the cart from Firestore
    if (isOnline && user && !('isOffline' in user) && unpurchasedItems.length > 0) {
      try {
        const batch = writeBatch(db);
        unpurchasedItems.forEach(item => {
          const itemRef = doc(db, 'users', uid, 'purchases', purchaseId, 'items', item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      } catch (err) {
        console.warn("Erro ao deletar itens não adicionados ao carrinho no Firestore:", err);
      }
    }

    // 2. Keep only items in cart in state and local storage
    const remainingItems = itemsInCart;
    const finalItemsTotal = remainingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const pur = purchases.find(p => p.id === purchaseId);
    const discount = pur?.discount || 0;
    const fee = pur?.additionalFee || 0;
    const grandTotal = Math.max(0, finalItemsTotal - discount + fee);

    setPurchaseItems(prev => {
      const allItems = { ...prev, [purchaseId]: remainingItems };
      if (user) saveUserData('purchase_items', allItems, user.uid);
      return allItems;
    });

    // 3. Mark purchase as completed and save recalculated total
    await updatePurchase(purchaseId, {
      status: 'completed',
      total: grandTotal
    });

    // 4. Update catalog last prices and brands for purchased items (RN-COM-006)
    for (const item of remainingItems) {
      if (item.unitPrice > 0) {
        await updateProduct(item.productId, {
          lastPrice: item.unitPrice,
          brand: item.productBrand || undefined,
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const reopenPurchase = async (purchaseId: string) => {
    await updatePurchase(purchaseId, { status: 'inProgress' });
  };

  // Completely wipe local storage and cached browser session
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setUserProfile(null);
      setCategories(DEFAULT_CATEGORIES('guest'));
      setProducts([]);
      setPurchases([]);
      setPurchaseItems({});
    } catch (err) {
      console.warn("Erro ao limpar armazenamento local:", err);
    }
  }, []);

  return {
    user,
    loading,
    isSyncing,
    isOnline,
    categories,
    products,
    purchases,
    purchaseItems,
    themeMode,
    setThemeMode,
    themeColor,
    setThemeColor,
    loginWithGoogle,
    logout,
    seedDefaults,
    syncGuestDataToAccount,
    clearAllData,
    clearLocalStorage,
    importBackup,
    
    // Auth Core & Profile Methods
    registerWithEmail,
    loginWithEmail,
    findUserForRecovery,
    resetPasswordDirect,
    updateProfileName,
    sendPasswordReset,
    updateUserProfileData,
    changeUserPassword,
    sendVerificationEmail,
    userProfile,
    
    // CRUD
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    addPurchase,
    updatePurchase,
    deletePurchase,
    duplicatePurchase,
    addPurchaseItem,
    updatePurchaseItem,
    deletePurchaseItem,
    toggleItemChecked,
    toggleAllItemsChecked,
    completePurchase,
    reopenPurchase
  };
}
export type ShoppingDataContext = ReturnType<typeof useShoppingData>;
