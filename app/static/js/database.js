// Database Implementation with Supabase Cloud & Local Fallback

const DB_KEY = 'agrosmart_db';

class Database {
    constructor() {
        this.supabase = null;
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config) {
            console.warn("CONFIG not found. Check if config.js is loaded.");
            this.initLocalDB();
            return;
        }
        if (typeof supabase !== 'undefined' && config.SUPABASE_URL && config.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
            this.supabase = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        }
        // No initDB needed for Supabase as it's remote, but keep localStorage for local dev/fallback
        this.initLocalDB();
    }

    async runMidnightChatCleanup() {
        const lastClearDateStr = localStorage.getItem('last_chat_cleanup');
        const todayStr = new Date().toISOString().split('T')[0];

        if (lastClearDateStr !== todayStr) {
            console.log("🌟 Medianoche detectada: Ejecutando borrado total de historiales de chat para liberar caché.");
            if (this.supabase) {
                try {
                    if (navigator.onLine) {
                        const { error } = await this.supabase.from('messages').delete().neq('id', 0);
                        if (error) console.warn("Error limpiando chats en Supabase:", error);
                    }
                } catch(e) {
                    console.warn("Fallo borrado de Supabase (posiblemente offline):", e.message);
                }
            } 
            
            // Local fallback cleanup
            const db = this.getLocalDB();
            if (db) {
                db.messages = [];
                this.saveLocalDB(db);
            }

            localStorage.setItem('last_chat_cleanup', todayStr);
        }
    }

    initLocalDB() {
        if (!localStorage.getItem(DB_KEY)) {
            const initialData = {
                users: [],
                crops: [],
                messages: [],
                fertilizer_logs: [],
                chat_groups: [],
                chat_group_members: [],
                posts: [],
                post_comments: [],
                friendships: []
            };
            this.saveLocalDB(initialData);
        }
    }

    getLocalDB() {
        return JSON.parse(localStorage.getItem(DB_KEY));
    }

    saveLocalDB(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    async hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- Users ---
    async getUserByEmail(email) {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('users').select('*').eq('email', email).maybeSingle();
                if (!error && data) return data;
                if (error && error.code !== 'PGRST116') throw error; // Re-throw real errors to trigger fallback
            } catch(e) {
                console.warn("[Offline/Error] Fallback to local DB for getUserByEmail", e);
            }
        }
        return this.getLocalDB().users.find(u => u.email === email);
    }

    async getUserById(id) {
        if (!id) return null;
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('users').select('*').eq('id', id).maybeSingle();
                if (error) {
                    console.warn("[Supabase] Error en getUserById:", error.message);
                    throw error; 
                }
                if (data) return data;
            } catch(e) {
                // Silenced offline fallback log
            }
        }
        
        const localUser = this.getLocalDB().users.find(u => String(u.id) === String(id));
        if (localUser) return localUser;
        
        return null;
    }

    async createUser(userObj) {
        const hashedPassword = await this.hashPassword(userObj.password);
        const baseUser = {
            ...userObj,
            password: hashedPassword,
            is_superuser: userObj.is_superuser || false,
            is_active: true,
            role: userObj.role || 'farmer',
            country_id: userObj.country_id || null,
            org_id: userObj.org_id || null,
            date_joined: new Date().toISOString(),
            suspension_end: null,
            suspension_reason: null,
            suspended_by: null,
            full_name: userObj.full_name || null,
            avatar_url: userObj.avatar_url || null,
            bio: userObj.bio || null,
            phone: userObj.phone || null,
            phone_country_code: userObj.phone_country_code || '+503',
            whatsapp: userObj.whatsapp || userObj.phone || null,
            whatsapp_opt_in: userObj.whatsapp_opt_in !== undefined ? userObj.whatsapp_opt_in : false,
            whatsapp_verified: false
        };

        if (this.supabase) {
            try {
                // Limit enforcement for all regional users (everyone except corporate creators)
                if (baseUser.role !== 'global_owner' && baseUser.country_id) {
                    const countries = await this.getCountries();
                    const country = countries.find(c => String(c.id) === String(baseUser.country_id));
                    const plan = country ? (country.plan || 'none') : 'none';
                    
                    if (plan !== 'esmeralda') {
                        const limits = { 'none': 50, 'bronce': 1000, 'platinium': 2500, 'diamante': 5000 };
                        const limit = limits[plan] || 50;
                        
                        const { count, error: countErr } = await this.supabase
                            .from('users')
                            .select('*', { count: 'exact', head: true })
                            .eq('country_id', baseUser.country_id)
                            .neq('role', 'global_owner');
                        
                        if (!countErr && count >= limit) {
                            throw new Error(`Límite de capacidad alcanzado para el plan ${plan.toUpperCase()} de este país (${limit} usuarios).`);
                        }
                    }
                }

                let { data, error } = await this.supabase.from('users').insert([baseUser]).select().single();
                if (error && error.message?.includes('schema cache')) {
                    // Si la columna aún no ha sido creada en Supabase, omitimos temporalmente esas columnas nuevas
                    const legacyUser = { ...baseUser };
                    delete legacyUser.phone_country_code;
                    delete legacyUser.whatsapp_opt_in;
                    delete legacyUser.whatsapp_verified;
                    const retryRes = await this.supabase.from('users').insert([legacyUser]).select().single();
                    data = retryRes.data;
                    error = retryRes.error;
                }
                if (error) throw new Error(error.message);
                return data;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch') && !e.message?.includes('Límite')) throw e;
                if (e.message?.includes('Límite')) throw e;
                console.warn("[Offline] Fallback to local DB for createUser");
            }
        }
        
        const db = this.getLocalDB();
        if (db.users.find(u => u.email === userObj.email)) throw new Error("User already exists");
        const newUser = { id: Date.now(), ...baseUser };
        db.users.push(newUser);
        this.saveLocalDB(db);
        return newUser;
    }

    async suspendUser(userId, hours, reason, adminId) {
        const endDate = hours === 999999 ? new Date(2100, 0, 1) : new Date(Date.now() + (hours * 60 * 60 * 1000));
        const endIso = endDate.toISOString();

        if (this.supabase) {
            try {
                const { error } = await this.supabase.from('users').update({
                    suspension_end: endIso,
                    suspension_reason: reason,
                    suspended_by: adminId
                }).eq('id', userId);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn("[Offline] Fallback to local DB for suspendUser");
            }
        }

        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, suspension_end: endIso, suspension_reason: reason, suspended_by: adminId } : u);
        this.saveLocalDB(db);
    }

    async removeSuspension(userId) {
        if (this.supabase) {
            try {
                const { error } = await this.supabase.from('users').update({
                    suspension_end: null,
                    suspension_reason: null,
                    suspended_by: null
                }).eq('id', userId);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn("[Offline] Fallback to local DB for removeSuspension");
            }
        }

        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, suspension_end: null, suspension_reason: null, suspended_by: null } : u);
        this.saveLocalDB(db);
    }

    async setAdminStatus(userId, isSuperUser, role = 'farmer', plan = null) {
        if (this.supabase) {
            try {
                const updateData = { is_superuser: isSuperUser, role: role };
                if (plan) updateData.plan = plan;
                
                const { error } = await this.supabase.from('users').update(updateData).eq('id', userId);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn("[Offline] Fallback to local DB for setAdminStatus");
            }
        }

        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, is_superuser: isSuperUser, role: role, plan: plan || u.plan } : u);
        this.saveLocalDB(db);
    }

    async updateUserPlan(userId, plan) {
        if (this.supabase) {
            try {
                const { error } = await this.supabase.from('users').update({ plan: plan }).eq('id', userId);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn("[Offline] Fallback to local DB for updateUserPlan");
            }
        }

        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, plan: plan } : u);
        this.saveLocalDB(db);
    }

    async updateUserAffiliation(userId, countryId, orgId) {
        // Handle "none" selection as null for database
        const processedOrgId = orgId === 'none' ? null : orgId;

        if (this.supabase) {
            try {
                const { error } = await this.supabase.from('users').update({ 
                    country_id: countryId, 
                    org_id: processedOrgId 
                }).eq('id', userId);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn("[Offline] Fallback to local DB for updateUserAffiliation");
            }
        }

        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, country_id: countryId, org_id: processedOrgId } : u);
        this.saveLocalDB(db);
    }

    async getAllUsers(currentUser = null) {
        if (this.supabase) {
            let query = this.supabase.from('users').select('*');
            if (currentUser) {
                if (currentUser.role === 'global_owner') {
                    // All users, no filters
                } else if (currentUser.role === 'ministry_admin') {
                    // Users from their country OR all Global Owners (Creators)
                    query = query.or(`country_id.eq.${currentUser.country_id},role.eq.global_owner`);
                } else if (currentUser.role === 'org_admin') {
                    // Only Ministry Admins of their country OR other Org Admins of their country OR their own Farmers
                    // Note: Cannot see global_owners or independent farmers
                    query = query.eq('country_id', currentUser.country_id)
                                 .or(`role.eq.ministry_admin,role.eq.org_admin,and(role.eq.farmer,org_id.eq.${currentUser.org_id})`);
                } else if (currentUser.role === 'farmer') {
                    // Only see Government Admins of their country OR all Global Owners
                    query = query.or(`and(role.eq.ministry_admin,country_id.eq.${currentUser.country_id}),role.eq.global_owner`);
                } else {
                    return [currentUser];
                }
            }
            const { data, error } = await query;
            if (error) console.warn("[Supabase warning]:", error);
            return data || [];
        }

        const db = this.getLocalDB();
        if (!currentUser || currentUser.role === 'global_owner') return db.users;

        if (currentUser.role === 'ministry_admin') {
            return db.users.filter(u => u.country_id === currentUser.country_id || u.role === 'global_owner');
        }
        
        if (currentUser.role === 'org_admin') {
            return db.users.filter(u => 
                u.country_id === currentUser.country_id && 
                (u.role === 'ministry_admin' || u.role === 'org_admin' || (u.role === 'farmer' && u.org_id === currentUser.org_id))
            );
        }

        if (currentUser.role === 'farmer') {
            return db.users.filter(u => (u.country_id === currentUser.country_id && u.role === 'ministry_admin') || u.role === 'global_owner');
        }

        return db.users.filter(u => u.id === currentUser.id);
    }

    async updateUserPassword(userId, newPassword) {
        const hashedPassword = await this.hashPassword(newPassword);
        if (this.supabase) {
            const { error } = await this.supabase.from('users').update({ password: hashedPassword }).eq('id', userId);
            if (error) console.warn("[Supabase warning]:", error);
            return;
        }
        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, password: hashedPassword } : u);
        this.saveLocalDB(db);
    }

    async updateUserProfile(userId, profileData) {
        if (this.supabase) {
            try {
                const updatePayload = {
                    full_name: profileData.full_name,
                    avatar_url: profileData.avatar_url,
                    bio: profileData.bio
                };
                
                if (profileData.phone !== undefined) updatePayload.phone = profileData.phone;
                if (profileData.phone_country_code !== undefined) updatePayload.phone_country_code = profileData.phone_country_code;
                if (profileData.whatsapp !== undefined) updatePayload.whatsapp = profileData.whatsapp;
                if (profileData.whatsapp_opt_in !== undefined) updatePayload.whatsapp_opt_in = profileData.whatsapp_opt_in;
                
                let { data, error } = await this.supabase.from('users').update(updatePayload).eq('id', userId).select();
                if (error && error.message?.includes('schema cache')) {
                    delete updatePayload.phone_country_code;
                    delete updatePayload.whatsapp_opt_in;
                    const retryRes = await this.supabase.from('users').update(updatePayload).eq('id', userId).select();
                    data = retryRes.data;
                    error = retryRes.error;
                }
                if (error) throw new Error(error.message);
                if (!data || data.length === 0) throw new Error("No se pudo actualizar el perfil en la nube. Revisa las políticas RLS de la tabla users.");
                return;
            } catch(e) {
                console.warn("[Offline] Fallback to local DB for updateUserProfile", e);
                if (window.showErrorModal) {
                    window.showErrorModal('Error al actualizar perfil', e.message || JSON.stringify(e));
                }
            }
        }
        const db = this.getLocalDB();
        db.users = db.users.map(u => u.id === userId ? { ...u, ...profileData } : u);
        this.saveLocalDB(db);
    }

    async deleteUser(id) {
        if (this.supabase) {
            await this.supabase.from('crops').delete().eq('user_id', id);
            await this.supabase.from('posts').delete().eq('user_id', id);
            await this.supabase.from('post_comments').delete().eq('user_id', id);
            await this.supabase.from('messages').delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`);
            await this.supabase.from('chat_group_members').delete().eq('user_id', id);
            
            // Cascading manual rules to avoid FK constraints errors on Admins
            await this.supabase.from('chat_groups').delete().eq('created_by', id);
            await this.supabase.from('friendships').delete().or(`user_id1.eq.${id},user_id2.eq.${id}`);
            await this.supabase.from('users').update({ suspended_by: null }).eq('suspended_by', id);
            
            const { error } = await this.supabase.from('users').delete().eq('id', id);
            if (error) {
                console.warn("[Supabase warning]:", error);
                throw new Error(error.message);
            }
            return;
        }
        const db = this.getLocalDB();
        db.users = db.users.filter(u => u.id !== id);
        db.crops = db.crops.filter(c => c.user_id !== id);
        if (db.posts) db.posts = db.posts.filter(p => p.user_id !== id);
        if (db.post_comments) db.post_comments = db.post_comments.filter(pc => pc.user_id !== id);
        if (db.messages) db.messages = db.messages.filter(m => m.sender_id !== id && m.receiver_id !== id);
        this.saveLocalDB(db);
    }

    async getCropsByUser(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase.from('crops').select('*').eq('user_id', userId);
            if (error) console.warn("[Supabase warning]:", error);
            return data || [];
        }
        return this.getLocalDB().crops.filter(c => c.user_id === userId);
    }

    async getCountries() {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('countries').select('*').neq('code', 'CORP');
                if (!error && data) return data;
            } catch(e) { /* Silenced */ }
        }
        return [
            { id: 1, name: 'El Salvador', code: 'SV', plan: 'esmeralda' },
            { id: 10, name: 'Guatemala', code: 'GT', plan: 'none' },
            { id: 11, name: 'Honduras', code: 'HN', plan: 'none' },
            { id: 12, name: 'Nicaragua', code: 'NI', plan: 'none' },
            { id: 13, name: 'Costa Rica', code: 'CR', plan: 'none' },
            { id: 14, name: 'Panamá', code: 'PA', plan: 'none' },
            { id: 15, name: 'Belice', code: 'BZ', plan: 'none' }
        ];
    }

    async setCountryPlan(countryId, plan) {
        if (this.supabase) {
            const { error } = await this.supabase.from('countries').update({ plan }).eq('id', countryId);
            if (error) throw error;
            return true;
        }
        // Local fallback
        return true;
    }

    async getCooperativasByCountry(countryId) {
        if (!countryId || countryId === 'null') return [];
        
        if (this.supabase) {
            const { data, error } = await this.supabase.from('organizations').select('*').eq('country_id', countryId);
            if (error) {
                console.warn("[Supabase] Organizations Warning:", error);
                return [];
            }
            return data || [];
        }
        return [{ id: 1, country_id: 1, name: 'Cooperativa Agrícola SV' }];
    }

    async createCooperativa(name, countryId) {
        if (this.supabase) {
            // Limit enforcement
            const countries = await this.getCountries();
            const country = countries.find(c => String(c.id) === String(countryId));
            const plan = country ? (country.plan || 'none') : 'none';
            
            if (plan !== 'esmeralda') {
                const limits = { 'none': 1, 'bronce': 3, 'platinium': 10, 'diamante': 25 };
                const limit = limits[plan] || 1;
                
                const { count, error: countErr } = await this.supabase
                    .from('organizations')
                    .select('*', { count: 'exact', head: true })
                    .eq('country_id', countryId);
                
                if (!countErr && count >= limit) {
                    throw new Error(`Límite de cooperativas alcanzado para el plan ${plan.toUpperCase()} de este país (${limit}).`);
                }
            }

            const { data, error } = await this.supabase.from('organizations').insert([{ name, country_id: countryId }]).select();
            if (error) throw error;
            return data[0];
        }
        const db = this.getLocalDB();
        const newOrg = { id: Date.now(), country_id: countryId, name };
        db.organizations.push(newOrg);
        this.saveLocalDB(db);
        return newOrg;
    }

    async updateCooperativa(id, name) {
        if (this.supabase) {
            const { data, error } = await this.supabase.from('organizations').update({ name }).eq('id', id).select();
            if (error) throw error;
            return data[0];
        }
        const db = this.getLocalDB();
        const org = db.organizations.find(o => o.id === parseInt(id));
        if (org) org.name = name;
        this.saveLocalDB(db);
        return org;
    }

    async deleteCooperativa(id) {
        if (this.supabase) {
            const { error } = await this.supabase.from('organizations').delete().eq('id', id);
            if (error) throw error;
            return true;
        }
        const db = this.getLocalDB();
        db.organizations = db.organizations.filter(o => o.id !== parseInt(id));
        this.saveLocalDB(db);
        return true;
    }

    async getAllCrops(currentUser = null) {
        if (this.supabase && navigator.onLine) {
            let query = this.supabase.from('crops').select('*');
            
            if (currentUser) {
                if (currentUser.role === 'global_owner') {
                    // Sees everything
                } else if (currentUser.role === 'ministry_admin') {
                    // Filter crops by users in the same country
                    const { data: userIds } = await this.supabase.from('users').select('id').eq('country_id', currentUser.country_id);
                    const ids = (userIds || []).map(u => u.id);
                    query = query.in('user_id', ids);
                } else if (currentUser.role === 'org_admin') {
                    // Filter by organization
                    query = query.eq('org_id', currentUser.org_id);
                } else {
                    // Standard farmer
                    // Fix: PostgREST requires 'is.null' not 'eq.null' inside OR blocks.
                    // If org_id is null, we only want their own crops. If they have an org_id, we want their crops OR crops belonging to their org.
                    if (currentUser.org_id) {
                        query = query.or(`user_id.eq.${currentUser.id},org_id.eq.${currentUser.org_id}`);
                    } else {
                        query = query.eq('user_id', currentUser.id);
                    }
                }
            }

            try {
                const { data, error } = await query;
                let remoteCrops = (!error && data) ? data : [];
                
                // Mezclar con cultivos locales no sincronizados
                const db = this.getLocalDB();
                let localCrops = [];
                if (!currentUser || currentUser.role === 'global_owner') {
                    localCrops = db.crops;
                } else if (currentUser.role === 'ministry_admin') {
                    const countryUserIds = db.users.filter(u => u.country_id === currentUser.country_id).map(u => u.id);
                    localCrops = db.crops.filter(c => countryUserIds.includes(c.user_id));
                } else if (currentUser.role === 'org_admin') {
                    localCrops = db.crops.filter(c => c.org_id === currentUser.org_id);
                } else {
                    localCrops = db.crops.filter(c => c.user_id === currentUser.id || (currentUser.org_id && c.org_id === currentUser.org_id));
                }
                
                const merged = [...remoteCrops];
                localCrops.forEach(lc => {
                    if (!merged.find(rc => rc.id == lc.id)) {
                        merged.push(lc);
                    }
                });
                return merged;
            } catch (err) {
                // Silenced
            }
        }

        const db = this.getLocalDB();
        if (!currentUser) return db.crops;

        if (currentUser.role === 'global_owner') return db.crops;
        
        if (currentUser.role === 'ministry_admin') {
            const countryUserIds = db.users.filter(u => u.country_id === currentUser.country_id).map(u => u.id);
            return db.crops.filter(c => countryUserIds.includes(c.user_id));
        }

        if (currentUser.role === 'org_admin') {
            return db.crops.filter(c => c.org_id === currentUser.org_id);
        }

        // Farmer: own crops OR crops belonging to their organization
        return db.crops.filter(c => 
            c.user_id === currentUser.id || 
            (currentUser.org_id && c.org_id === currentUser.org_id)
        );
    }

    async createCrop(cropObj) {
        let createdCrop;
        // Inject org_id if user belongs to an organization
        const currentUser = await window.AuthObj.getCurrentUser();
        const baseCrop = {
            ...cropObj,
            org_id: currentUser ? currentUser.org_id : null,
            created_at: new Date().toISOString()
        };

        if (this.supabase) {
            const { data, error } = await this.supabase.from('crops').insert([baseCrop]).select().single();
            if (error) throw new Error(error.message);
            createdCrop = data;
        } else {
            const db = this.getLocalDB();
            createdCrop = { id: Date.now(), ...baseCrop };
            db.crops.push(createdCrop);
            this.saveLocalDB(db);
        }

        // --- Automatic Fertilizer Logs Logic ---
        await this.generateFertilizerLogs(createdCrop);

        return createdCrop;
    }

    async generateFertilizerLogs(cropObj) {
        const catalog = window.CROP_CATALOG || {};
        
        // Helper to normalize strings (remove accents/special chars)
        const normalize = (s) => (s || "").toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        const normalizedName = normalize(cropObj.name);
        console.log("Normalizando búsqueda:", cropObj.name, "=>", normalizedName);
        let catalogEntry = null;

        // Search in catalog using normalized keys
        const catalogKeys = Object.keys(catalog);
        console.log("Teclas del catálogo disponibles:", catalogKeys.length);
        
        const matchKey = catalogKeys.find(k => normalize(k) === normalizedName) || 
                         catalogKeys.find(k => normalizedName.includes(normalize(k)) || normalize(k).includes(normalizedName));
        
        console.log("Resultado del match:", matchKey);
        
        if (matchKey) catalogEntry = catalog[matchKey];

        if (catalogEntry && catalogEntry.fertilizer_plan) {
            const sowingDate = new Date(cropObj.sowing_date);
            const logEntries = catalogEntry.fertilizer_plan.map(plan => {
                const scheduledDate = new Date(sowingDate);
                scheduledDate.setDate(scheduledDate.getDate() + plan.day);
                
                return {
                    crop_id: cropObj.id,
                    // REMOVED user_id to match actual schema from screenshot
                    tip: `${plan.product} (${plan.dose})`,
                    scheduled_date: scheduledDate.toISOString().split('T')[0],
                    status: 'pendiente'
                };
            });

            if (this.supabase) {
                const { error: logErr } = await this.supabase.from('fertilizer_logs').insert(logEntries);
                if (logErr) {
                    console.warn("Warning creating automatic logs:", logErr);
                    throw new Error(logErr.message);
                }
            } else {
                const db = this.getLocalDB();
                if (!db.fertilizer_logs) db.fertilizer_logs = [];
                logEntries.forEach(log => {
                    log.id = Date.now() + Math.random();
                    db.fertilizer_logs.push(log);
                });
                this.saveLocalDB(db);
            }
            return true;
        }
        return false;
    }

    async deleteCrop(id) {
        if (this.supabase) {
            const { error } = await this.supabase.from('crops').delete().eq('id', id);
            if (error) console.warn("[Supabase warning]:", error);
            return;
        }
        const db = this.getLocalDB();
        db.crops = db.crops.filter(c => c.id !== id);
        this.saveLocalDB(db);
    }

    // --- Chat Messages ---
    async getMessages(userId1, userId2) {
        if (this.supabase && navigator.onLine) {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .is('group_id', null)
                .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
                .order('timestamp', { ascending: true });
            if (error) console.warn("[Supabase warning]:", error);
            return data || [];
        }
        return this.getLocalDB().messages.filter(m => 
            !m.group_id &&
            ((m.sender_id === userId1 && m.receiver_id === userId2) ||
            (m.sender_id === userId2 && m.receiver_id === userId1))
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // --- Chat Groups ---
    async createGroup(name, creatorId, userIds) {
        if (this.supabase) {
            // Create Group Document
            const { data: group, error: groupErr } = await this.supabase.from('chat_groups').insert([{
                name: name,
                created_by: creatorId,
                created_at: new Date().toISOString()
            }]).select().single();
            if (groupErr) throw new Error(groupErr.message);

            // Insert matching members
            const memberInserts = userIds.map(uid => ({ group_id: group.id, user_id: uid }));
            memberInserts.push({ group_id: group.id, user_id: creatorId }); // Always include creator
            const { error: memErr } = await this.supabase.from('chat_group_members').insert(memberInserts);
            if (memErr) throw new Error(memErr.message);

            return group;
        }

        const db = this.getLocalDB();
        const newGroup = { id: Date.now(), name, created_by: creatorId, created_at: new Date().toISOString() };
        db.chat_groups.push(newGroup);
        db.chat_group_members.push({ group_id: newGroup.id, user_id: creatorId });
        userIds.forEach(uid => db.chat_group_members.push({ group_id: newGroup.id, user_id: uid }));
        this.saveLocalDB(db);
        return newGroup;
    }

    async getUserGroups(userId) {
        if (this.supabase && navigator.onLine) {
            // Join query via Supabase relations
            const { data, error } = await this.supabase
                .from('chat_group_members')
                .select('group_id, chat_groups(*)')
                .eq('user_id', userId);
            if (error) console.warn("[Supabase warning]:", error);
            return data ? data.map(d => d.chat_groups) : [];
        }

        const db = this.getLocalDB();
        const myGroupIds = db.chat_group_members.filter(cm => cm.user_id === userId).map(cm => cm.group_id);
        return db.chat_groups.filter(g => myGroupIds.includes(g.id));
    }

    async getGroupMessages(groupId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('messages')
                .select('*')
                .eq('group_id', groupId)
                .order('timestamp', { ascending: true });
            if (error) console.warn("[Supabase warning]:", error);
            return data || [];
        }
        return this.getLocalDB().messages.filter(m => m.group_id === parseInt(groupId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async sendMessage(messageObj) {
        // Automatically inject group_id parameter handling implicitly in payload
        const payload = {
            ...messageObj,
            timestamp: new Date().toISOString(),
            is_read: false
        };

        if (this.supabase) {
            const { data, error } = await this.supabase.from('messages').insert([payload]).select().single();
            if (error) throw new Error(error.message);
            return data;
        }
        const db = this.getLocalDB();
        const newMsg = { id: Date.now(), ...payload };
        db.messages.push(newMsg);
        this.saveLocalDB(db);
        return newMsg;
    }

    async markAsRead(senderId, receiverId) {
        if (this.supabase) {
            const { error } = await this.supabase.from('messages')
                .update({ is_read: true })
                .eq('sender_id', senderId)
                .eq('receiver_id', receiverId);
            if (error) console.warn("[Supabase warning]:", error);
            return;
        }
        const db = this.getLocalDB();
        db.messages = db.messages.map(m => (m.sender_id === senderId && m.receiver_id === receiverId) ? { ...m, is_read: true } : m);
        this.saveLocalDB(db);
    }

    // --- AgroRed: Posts ---
    async createPost(userId, content, imageUrl = null) {
        const payload = {
            user_id: userId,
            content: content,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
            likes_count: 0
        };

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase.from('posts').insert([payload]).select().single();
                if (error) throw new Error(error.message);
                return data;
            } catch(e) {
                console.warn("Fallback to local posts", e);
            }
        }

        const db = this.getLocalDB();
        if (!db.posts) db.posts = [];
        const newPost = { id: Date.now(), ...payload };
        db.posts.push(newPost);
        this.saveLocalDB(db);
        return newPost;
    }

    async getPosts() {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('posts').select('*, users(full_name, email, avatar_url, role)').order('created_at', { ascending: false });
                if (!error) return data;
            } catch(e) {}
        }
        const db = this.getLocalDB();
        if (!db.posts) return [];
        return db.posts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(p => {
            const u = db.users.find(user => user.id === p.user_id) || {};
            return { ...p, users: { full_name: u.full_name, email: u.email, avatar_url: u.avatar_url, role: u.role }};
        });
    }

    async deletePost(postId) {
        if (this.supabase && navigator.onLine) {
            try {
                await this.supabase.from('posts').delete().eq('id', postId);
            } catch(e) {}
        }
        const db = this.getLocalDB();
        if (db.posts) db.posts = db.posts.filter(p => p.id !== postId);
        if (db.post_comments) db.post_comments = db.post_comments.filter(c => c.post_id !== postId);
        this.saveLocalDB(db);
    }

    async updatePost(postId, newContent) {
        if (this.supabase && navigator.onLine) {
            try {
                await this.supabase.from('posts').update({ content: newContent }).eq('id', postId);
            } catch(e) {}
        }
        const db = this.getLocalDB();
        const post = db.posts.find(p => p.id === postId);
        if (post) post.content = newContent;
        this.saveLocalDB(db);
    }

    async likePost(postId) {
        if (this.supabase) {
            try {
                // Fetch first to increment (simple approach)
                const { data: post } = await this.supabase.from('posts').select('likes_count').eq('id', postId).single();
                if (post) {
                    await this.supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', postId);
                }
                return;
            } catch(e) {}
        }
        const db = this.getLocalDB();
        const post = db.posts.find(p => p.id === postId);
        if (post) post.likes_count = (post.likes_count || 0) + 1;
        this.saveLocalDB(db);
    }

    // --- Post Comments ---
    async getPostComments(postId) {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('post_comments')
                    .select('*, users(full_name, email, avatar_url, role)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });
                if (!error) return data || [];
            } catch(e) {}
        }
        const db = this.getLocalDB();
        if (!db.post_comments) return [];
        return db.post_comments.filter(c => c.post_id === postId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map(c => {
                const u = db.users.find(user => user.id === c.user_id) || {};
                return { ...c, users: { full_name: u.full_name, email: u.email, avatar_url: u.avatar_url, role: u.role }};
            });
    }

    async createPostComment(postId, userId, content) {
        const payload = {
            post_id: postId,
            user_id: userId,
            content: content,
            created_at: new Date().toISOString()
        };

        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('post_comments').insert([payload]).select().single();
                if (error) throw new Error(error.message);
                return data;
            } catch(e) { console.warn(e); }
        }

        const db = this.getLocalDB();
        if (!db.post_comments) db.post_comments = [];
        const newComment = { id: Date.now(), ...payload };
        db.post_comments.push(newComment);
        this.saveLocalDB(db);
        return newComment;
    }

    // --- AgroRed: Friendships ---
    async sendFriendRequest(userId1, userId2) {
        if (userId1 === userId2) throw new Error("No puedes enviarte solicitud a ti mismo");
        if (this.supabase) {
            try {
                // Check if reverse exists
                const { data: existing } = await this.supabase.from('friendships')
                    .select('*')
                    .or(`and(user_id1.eq.${userId1},user_id2.eq.${userId2}),and(user_id1.eq.${userId2},user_id2.eq.${userId1})`)
                    .maybeSingle();
                if (existing) throw new Error("Ya existe una relación con este usuario");

                const { error } = await this.supabase.from('friendships').insert([{
                    user_id1: userId1, // Sender
                    user_id2: userId2, // Receiver
                    status: 'pending',
                    created_at: new Date().toISOString()
                }]);
                if (error) throw new Error(error.message);
                return;
            } catch(e) {
                if(e.message === "Ya existe una relación con este usuario") throw e;
                console.warn("Fallback friendship", e);
            }
        }
        const db = this.getLocalDB();
        if (!db.friendships) db.friendships = [];
        if (!db.friendships.find(f => (f.user_id1 === userId1 && f.user_id2 === userId2) || (f.user_id1 === userId2 && f.user_id2 === userId1))) {
            db.friendships.push({ id: Date.now(), user_id1: userId1, user_id2: userId2, status: 'pending', created_at: new Date().toISOString() });
            this.saveLocalDB(db);
        } else {
            throw new Error("Ya existe una relación con este usuario");
        }
    }

    async acceptFriendRequest(friendshipId) {
        if (this.supabase) {
            try {
                await this.supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
                return;
            } catch(e) {}
        }
        const db = this.getLocalDB();
        const f = db.friendships.find(f => f.id === friendshipId);
        if (f) f.status = 'accepted';
        this.saveLocalDB(db);
    }

    async getFriendships(userId) {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('friendships')
                    .select('*')
                    .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
                if (!error) return data;
            } catch(e) {}
        }
        const db = this.getLocalDB();
        if (!db.friendships) return [];
        return db.friendships.filter(f => f.user_id1 === userId || f.user_id2 === userId);
    }

    async deleteFriendship(friendshipId) {
        // First get friendship to know who the users are to delete messages
        let u1 = null, u2 = null;

        if (this.supabase && navigator.onLine) {
            try {
                const { data } = await this.supabase.from('friendships').select('*').eq('id', friendshipId).single();
                if (data) {
                    u1 = data.user_id1;
                    u2 = data.user_id2;
                }
                await this.supabase.from('friendships').delete().eq('id', friendshipId);
                if (u1 && u2) {
                    // Delete chat history between them
                    await this.supabase.from('messages')
                        .delete()
                        .or(`and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`);
                }
                return;
            } catch(e) { console.warn("Warning deleting friendship:", e); }
        }

        const db = this.getLocalDB();
        const f = db.friendships.find(fr => fr.id === friendshipId);
        if (f) {
            u1 = f.user_id1;
            u2 = f.user_id2;
            db.friendships = db.friendships.filter(fr => fr.id !== friendshipId);
            // Delete messages locally
            if (db.messages) {
                db.messages = db.messages.filter(m => !((m.sender_id === u1 && m.receiver_id === u2) || (m.sender_id === u2 && m.receiver_id === u1)));
            }
            this.saveLocalDB(db);
        }
    }

    // --- Encuestas Interactivas (Polls) ---
    async getPollVotes(postId) {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('post_poll_votes')
                    .select('*, users(full_name, avatar_url, email)')
                    .eq('post_id', postId);
                if (!error) return data || [];
            } catch(e) { console.warn("No poll table yet", e); }
        }
        const db = this.getLocalDB();
        if (!db.poll_votes) return [];
        return db.poll_votes.filter(v => v.post_id === postId);
    }

    async votePoll(postId, userId, optionIndex) {
        if (this.supabase && navigator.onLine) {
            try {
                const { error } = await this.supabase
                    .from('post_poll_votes')
                    .insert([{ post_id: postId, user_id: userId, option_index: optionIndex }]);
                if (error) throw new Error(error.message);
                return;
            } catch(e) { throw e; }
        }
        const db = this.getLocalDB();
        if (!db.poll_votes) db.poll_votes = [];
        if (db.poll_votes.find(v => v.post_id === postId && v.user_id === userId)) {
            throw new Error("Ya has votado en esta encuesta");
        }
        db.poll_votes.push({
            id: Date.now(),
            post_id: postId,
            user_id: userId,
            option_index: optionIndex,
            created_at: new Date().toISOString()
        });
        this.saveLocalDB(db);
    }

    // --- Soporte Prioritario y Videollamadas: Fichas de Reporte ---
    async notifyTicketEmail(report, type = 'new') {
        // Primary: Use NotificationService (n8n webhook)
        if (window.NotificationService) {
            try {
                if (type === 'call_alert') {
                    await window.NotificationService.sendVideocallAlert(report);
                } else {
                    await window.NotificationService.sendTicketNotification(report, type);
                }
                return; // Success via n8n, no need for EmailJS
            } catch(e) {
                console.warn('[DB] NotificationService failed, trying EmailJS fallback:', e.message);
            }
        }

        // Fallback: EmailJS (legacy)
        if (typeof emailjs === 'undefined' || typeof CONFIG === 'undefined') return;
        try {
            let toEmail = report.caller_email || 'soporte@agrosmart.global';
            let subject = '🚨 NUEVA FICHA DE SOPORTE - AGROSMART';
            let msg = `Se ha generado una nueva ficha de soporte técnica. Asunto: ${report.subject}. Descripción: ${report.description}. Solicitante: ${report.caller_name} (${report.caller_role}).`;

            if (type === 'call_alert') {
                toEmail = report.caller_email || 'usuario@gmail.com';
                subject = '🎥 ¡ADMINISTRADOR EN SALA DE VIDEOLLAMADA - AGROSMART!';
                msg = `Hola ${report.caller_name}, el administrador ha ingresado a la sala de videollamada para atender tu caso (${report.subject}).`;
            } else if (type === 'escalated' || report.target_role === 'global_owner') {
                toEmail = 'creadores.atlasdigital@agrosmart.global';
                subject = '🚨 [ESCALAMIENTO GLOBAL] FICHA DIRIGIDA A CREADORES AGROSMART';
                msg = `Un Administrador de Ministerio ha escalado una ficha. Asunto: ${report.subject}. Descripción: ${report.description}.`;
            } else if (report.target_role === 'ministry_admin') {
                toEmail = 'admin.ministerio@agrosmart.global';
                subject = '🚨 [ALERTA PAÍS] NUEVO REPORTE DE AGRICULTOR / COOPERATIVA';
                msg = `Se ha generado una ficha de reporte en su jurisdicción. Solicitante: ${report.caller_name}. Tiempo máximo de respuesta: 72 horas.`;
            }

            if (CONFIG.EMAILJS_SERVICE_ID && CONFIG.EMAILJS_TEMPLATE_ID && CONFIG.EMAILJS_PUBLIC_KEY) {
                emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
                    to_email: toEmail,
                    from_name: 'AgroSmart Soporte Satelital',
                    subject: subject,
                    message: msg
                }, CONFIG.EMAILJS_PUBLIC_KEY).catch(e => console.warn("EmailJS send error:", e));
            }
        } catch(e) { console.warn("Error en notificación EmailJS:", e); }
    }

    async createVideocallReport(reportObj) {
        // Regla estricta: Los creadores/dueños globales no pueden generar fichas
        if (reportObj.caller_role === 'global_owner') {
            throw new Error("Los Creadores Globales no tienen potestad de crear fichas, su rol es resolver incidencias escaladas.");
        }

        const currentUser = window.AuthObj ? await window.AuthObj.getCurrentUser() : null;
        let initialTarget = 'ministry_admin';
        
        if (currentUser) {
            if (currentUser.role === 'org_admin') {
                initialTarget = 'ministry_admin'; // Admins de cooperativa escalan sus propios problemas al ministerio
            } else if (currentUser.role === 'ministry_admin') {
                initialTarget = 'global_owner'; // Admins de ministerio escalan sus propios problemas a los dueños
            } else if (currentUser.org_id) {
                initialTarget = 'org_admin'; // Agricultores en cooperativa van a su admin de cooperativa
            } else {
                initialTarget = 'ministry_admin'; // Agricultores independientes van al ministerio
            }
        }

        const payload = {
            caller_id: String(reportObj.caller_id || 'guest'),
            caller_name: reportObj.caller_name || 'Usuario',
            caller_role: reportObj.caller_role || 'farmer',
            target_role: initialTarget,
            country: reportObj.country || 'Global',
            org_id: currentUser ? currentUser.org_id : null,
            subject: reportObj.subject || 'Asistencia Técnica',
            description: reportObj.description || '',
            status: 'open',
            is_escalated: false,
            requires_video: reportObj.requires_video || false,
            room_name: reportObj.requires_video ? (reportObj.room_name || 'AgroSmart_Room_' + Date.now()) : null,
            assigned_to: null,
            assigned_at: null,
            history: [{ action: 'created', by: currentUser ? currentUser.id : 'guest', timestamp: new Date().toISOString() }],
            created_at: new Date().toISOString()
        };

        let created = null;
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('videocall_reports')
                    .insert([payload])
                    .select()
                    .single();
                if (!error && data) created = data;
            } catch(e) {
                console.warn("[Offline/Supabase Error] Guardando ficha localmente", e);
                window.showErrorModal('Error Base de Datos', 'Fallo al subir a Supabase: ' + (e.message || JSON.stringify(e)));
            }
        }

        if (!created) {
            const db = this.getLocalDB();
            if (!db.videocall_reports) db.videocall_reports = [];
            const newReport = { id: 'local_' + Date.now() + '_' + Math.floor(Math.random()*1000), ...payload };
            db.videocall_reports.push(newReport);
            this.saveLocalDB(db);
            created = newReport;
        }

        // Notificar por EmailJS al destinario
        this.notifyTicketEmail(created, 'new');
        return created;
    }

    async getVideocallReports(currentUser = null) {
        let allReports = [];
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase.from('videocall_reports').select('*').order('created_at', { ascending: false });
                if (!error && data) allReports = data;
            } catch(e) {
                console.warn("[Offline/Supabase Error] Leyendo fichas locales", e);
            }
        }

        const db = this.getLocalDB();
        if (db.videocall_reports && db.videocall_reports.length > 0) {
            // Unir fichas locales con las de Supabase evitando duplicados por ID
            const supabaseIds = new Set(allReports.map(r => String(r.id)));
            const localOnly = db.videocall_reports.filter(r => !supabaseIds.has(String(r.id)));
            allReports = [...allReports, ...localOnly].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        }

        // Calcular estado Crítico (72 horas sin resolver)
        const now = new Date();
        allReports = allReports.map(r => {
            const created = new Date(r.created_at);
            const hours = (now - created) / (1000 * 60 * 60);
            if (r.status !== 'resolved' && r.status !== 'closed' && hours >= 72) {
                r.is_critical = true;
                r.status = 'critical';
            }
            return r;
        });

        if (!currentUser) return allReports;

        // Lógica de filtrado según roles estrictos solicitada por el usuario:
        const role = currentUser.role || 'farmer';
        
        // Si el usuario quiere ver TODO el historial, podemos saltar el filtro de `assigned_to`
        // Por ahora mantenemos la lógica de que un caso asignado a alguien desaparece de los demás
        // Solo mostraremos si `assigned_to` es null, o si es igual a currentUser.id, O si currentUser fue el creador.
        
        const isAssignedToMeOrUnassigned = (r) => {
            return !r.assigned_to || String(r.assigned_to) === String(currentUser.id) || String(r.caller_id) === String(currentUser.id);
        };

        if (role === 'global_owner') {
            return allReports.filter(r => ((r.target_role === 'global_owner' || r.is_escalated === true) && isAssignedToMeOrUnassigned(r)) || String(r.caller_id) === String(currentUser.id));
        } else if (role === 'ministry_admin') {
            return allReports.filter(r => r.target_role === 'ministry_admin' && String(r.country) === String(currentUser.country_id || r.country) && isAssignedToMeOrUnassigned(r));
        } else if (role === 'org_admin') {
            return allReports.filter(r => r.target_role === 'org_admin' && String(r.org_id) === String(currentUser.org_id) && isAssignedToMeOrUnassigned(r));
        } else {
            // Agricultores o miembros de cooperativas solo ven sus propias fichas
            return allReports.filter(r => String(r.caller_id) === String(currentUser.id));
        }
    }

    async assignVideocallReport(reportId, adminUser) {
        return await this.updateVideocallReport(reportId, {
            assigned_to: adminUser.id,
            attended_by_name: adminUser.full_name || adminUser.email,
            assigned_at: new Date().toISOString(),
            status: 'in_progress',
            _append_history: { action: 'assigned', by: adminUser.id, timestamp: new Date().toISOString() }
        });
    }

    async escalateVideocallReport(reportId, adminUser) {
        let newTarget = 'ministry_admin';
        if (adminUser.role === 'ministry_admin') {
            newTarget = 'global_owner';
        }
        return await this.updateVideocallReport(reportId, {
            target_role: newTarget,
            assigned_to: null,
            assigned_at: null,
            is_escalated: true,
            status: 'open',
            _append_history: { action: 'escalated', to: newTarget, by: adminUser.id, timestamp: new Date().toISOString() }
        });
    }

    async updateVideocallReport(reportId, updateData) {
        const historyAction = updateData._append_history;
        delete updateData._append_history;

        if (updateData.is_escalated === true && !updateData.target_role) {
            updateData.target_role = 'global_owner';
        }

        let updated = null;
        if (this.supabase && navigator.onLine && !String(reportId).startsWith('local_')) {
            try {
                // Fetch first to append history
                const { data: current } = await this.supabase.from('videocall_reports').select('history').eq('id', reportId).single();
                if (current && historyAction) {
                    updateData.history = [...(current.history || []), historyAction];
                }
                const { data, error } = await this.supabase
                    .from('videocall_reports')
                    .update(updateData)
                    .eq('id', reportId)
                    .select()
                    .single();
                if (!error && data) updated = data;
            } catch(e) {
                console.warn("[Offline/Supabase Error] Actualizando ficha localmente", e);
            }
        }

        if (!updated) {
            const db = this.getLocalDB();
            if (db.videocall_reports) {
                const index = db.videocall_reports.findIndex(r => String(r.id) === String(reportId));
                if (index !== -1) {
                    if (historyAction) {
                        updateData.history = [...(db.videocall_reports[index].history || []), historyAction];
                    }
                    db.videocall_reports[index] = { ...db.videocall_reports[index], ...updateData };
                    this.saveLocalDB(db);
                    updated = db.videocall_reports[index];
                }
            }
        }

        if (updated && (updateData.is_escalated || updateData.status === 'resolved')) {
            this.notifyTicketEmail(updated, updateData.is_escalated ? 'escalated' : 'resolved');
        }
        return updated;
    }

    // --- AGRORED FORUMS & COMMUNITIES ---

    async getCommunities() {
        if (this.supabase) {
            const { data, error } = await this.supabase.from('communities').select('*');
            if (error) console.warn("Supabase warning:", error);
            return data || [];
        }
        return [];
    }

    async getCommunityMembersCount(communityId) {
        if (this.supabase) {
            const { count, error } = await this.supabase
                .from('community_members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId);
            if (error) console.warn("Supabase warning:", error);
            return count || 0;
        }
        return 0;
    }

    async joinCommunity(communityId, userId) {
        if (this.supabase) {
            const { error } = await this.supabase.from('community_members').insert({ community_id: communityId, user_id: userId });
            if (error && error.code !== '23505') throw error; // Ignore duplicate key
            return true;
        }
        return true;
    }

    async getForums() {
        if (this.supabase) {
            const { data, error } = await this.supabase.from('forums').select('*, users(*)').order('created_at', { ascending: false });
            if (error) console.warn("Supabase warning:", error);
            return data || [];
        }
        return [];
    }

    async createForum(name, description, createdBy) {
        if (this.supabase) {
            const { data, error } = await this.supabase.from('forums').insert({ name, description, created_by: createdBy }).select().single();
            if (error) throw error;
            return data;
        }
        throw new Error("Modo offline no soporta creación de foros aún.");
    }

    async getForumPostsCount(forumId) {
        // En el futuro los posts pueden estar vinculados al forum_id. 
        // Por ahora, simulamos un contador dinámico.
        return Math.floor(Math.random() * 50) + 1;
    }

    // --- Crop Activities (WhatsApp-Ready Unified Activity System) ---

    /**
     * Create a crop activity (abonado, fertilización, riego, poda, fumigación, cosecha)
     */
    async createCropActivity(activityObj) {
        const payload = {
            user_id: activityObj.user_id || null,
            crop_id: activityObj.crop_id,
            activity_type: activityObj.activity_type,
            crop_name: activityObj.crop_name || null,
            description: activityObj.description || null,
            scheduled_date: activityObj.scheduled_date,
            scheduled_time: activityObj.scheduled_time || null,
            status: 'pendiente',
            whatsapp_reminder_sent: false,
            created_at: new Date().toISOString()
        };

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw new Error(error.message);
                return data;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn('[Offline] Fallback to local DB for createCropActivity');
            }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) db.crop_activities = [];
        const newActivity = { id: Date.now(), ...payload };
        db.crop_activities.push(newActivity);
        this.saveLocalDB(db);
        return newActivity;
    }

    /**
     * Get all activities for a user (used by Dashboard Reminders section)
     */
    async getCropActivitiesByUser(userId) {
        if (!userId) return [];

        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .select('*, crops(name, sowing_date)')
                    .eq('user_id', userId)
                    .order('scheduled_date', { ascending: true });
                if (!error) return data || [];
            } catch(e) {
                console.warn('[DB] Error fetching user activities:', e);
            }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) return [];
        const userCrops = (db.crops || []).filter(c => String(c.user_id) === String(userId));
        const cropIds = userCrops.map(c => String(c.id));
        
        return db.crop_activities
            .filter(a => cropIds.includes(String(a.crop_id)) || String(a.user_id) === String(userId))
            .map(a => {
                const crop = userCrops.find(c => String(c.id) === String(a.crop_id));
                return {
                    ...a,
                    crops: crop ? { name: crop.name } : { name: 'Cultivo' }
                };
            })
            .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    }

    /**
     * Bulk create crop activities (used when creating a crop)
     */
    async createCropActivitiesBulk(activities) {
        if (!activities || activities.length === 0) return [];

        const payloads = activities.map(a => ({
            crop_id: a.crop_id,
            activity_type: a.activity_type,
            description: a.description || null,
            scheduled_date: a.scheduled_date,
            status: 'pendiente',
            whatsapp_reminder_sent: false,
            created_at: new Date().toISOString()
        }));

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .insert(payloads)
                    .select();
                if (error) {
                    console.warn('Warning creating crop activities:', error);
                    throw new Error(error.message);
                }
                return data || [];
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn('[Offline] Fallback to local DB for createCropActivitiesBulk');
            }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) db.crop_activities = [];
        const created = payloads.map(p => ({ id: Date.now() + Math.random(), ...p }));
        created.forEach(a => db.crop_activities.push(a));
        this.saveLocalDB(db);
        return created;
    }

    /**
     * Get all activities for a specific crop
     */
    async getCropActivitiesByCrop(cropId) {
        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .select('*')
                    .eq('crop_id', cropId)
                    .order('scheduled_date', { ascending: true });
                if (!error) return data || [];
            } catch(e) { /* Fallback */ }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) return [];
        return db.crop_activities
            .filter(a => String(a.crop_id) === String(cropId))
            .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
    }

    /**
     * Get activities scheduled for a specific date (used by n8n)
     */
    async getCropActivitiesByDate(date) {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        if (this.supabase && navigator.onLine) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .select('*, crops(name, user_id)')
                    .eq('scheduled_date', dateStr)
                    .in('status', ['pendiente', 'reprogramado'])
                    .eq('whatsapp_reminder_sent', false);
                if (!error) return data || [];
            } catch(e) { /* Fallback */ }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) return [];
        return db.crop_activities.filter(a =>
            a.scheduled_date === dateStr &&
            ['pendiente', 'reprogramado'].includes(a.status) &&
            !a.whatsapp_reminder_sent
        );
    }

    /**
     * Update the status of a crop activity
     * @param {number} activityId
     * @param {string} status - 'pendiente', 'realizado', 'reprogramado', 'omitido'
     * @param {object} extraData - Optional: { completed_at, rescheduled_to, response_received }
     */
    async updateCropActivityStatus(activityId, status, extraData = {}) {
        const updatePayload = { status, ...extraData };

        if (status === 'realizado' && !updatePayload.completed_at) {
            updatePayload.completed_at = new Date().toISOString();
        }

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('crop_activities')
                    .update(updatePayload)
                    .eq('id', activityId)
                    .select()
                    .single();
                if (error) throw new Error(error.message);
                return data;
            } catch(e) {
                if (!e.message?.includes('Failed to fetch')) throw e;
                console.warn('[Offline] Fallback to local DB for updateCropActivityStatus');
            }
        }

        const db = this.getLocalDB();
        if (!db.crop_activities) return null;
        const idx = db.crop_activities.findIndex(a => String(a.id) === String(activityId));
        if (idx !== -1) {
            db.crop_activities[idx] = { ...db.crop_activities[idx], ...updatePayload };
            this.saveLocalDB(db);
            return db.crop_activities[idx];
        }
        return null;
    }

    /** Reprogram an existing activity without creating a duplicate. */
    async rescheduleCropActivity(activityId, scheduledDate, scheduledTime) {
        const normalizedTime = String(scheduledTime || '').slice(0, 5);
        const target = new Date(`${scheduledDate}T${normalizedTime}:00`);
        if (!scheduledDate || !normalizedTime || Number.isNaN(target.getTime())) {
            throw new Error('Fecha u hora de reprogramación inválida.');
        }
        if (target <= new Date()) {
            throw new Error('La actividad solo puede reprogramarse para una fecha y hora futuras.');
        }
        return this.updateCropActivityStatus(activityId, 'reprogramado', {
            scheduled_date: scheduledDate,
            scheduled_time: normalizedTime,
            rescheduled_to: scheduledDate,
            response_received: 'reprogramado',
            whatsapp_reminder_sent: false,
            whatsapp_sent_at: null
        });
    }

    /**
     * Mark activity reminder as sent (used after WhatsApp message is dispatched)
     */
    async markActivityReminderSent(activityId) {
        return this.updateCropActivityStatus(activityId, 'pendiente', {
            whatsapp_reminder_sent: true,
            whatsapp_sent_at: new Date().toISOString()
        });
    }

    /**
     * Generate crop activities from the crop catalog fertilizer plan
     * Maps fertilizer_plan entries to crop_activities with type 'abonado'
     */
    async generateCropActivitiesFromCatalog(cropObj) {
        const catalog = window.CROP_CATALOG || {};
        const normalize = (s) => (s || '').toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        const normalizedName = normalize(cropObj.name);
        let catalogEntry = null;

        const catalogKeys = Object.keys(catalog);
        const matchKey = catalogKeys.find(k => normalize(k) === normalizedName) ||
                         catalogKeys.find(k => normalizedName.includes(normalize(k)) || normalize(k).includes(normalizedName));

        if (matchKey) catalogEntry = catalog[matchKey];

        if (catalogEntry && catalogEntry.fertilizer_plan) {
            const sowingDate = new Date(cropObj.sowing_date);
            const activities = catalogEntry.fertilizer_plan.map(plan => {
                const scheduledDate = new Date(sowingDate);
                scheduledDate.setDate(scheduledDate.getDate() + plan.day);

                return {
                    user_id: cropObj.user_id || null,
                    crop_id: cropObj.id,
                    activity_type: 'abonado',
                    description: `${plan.product} (${plan.dose})`,
                    scheduled_date: scheduledDate.toISOString().split('T')[0]
                };
            });

            try {
                await this.createCropActivitiesBulk(activities);
                return true;
            } catch(e) {
                console.warn('Error creating crop activities from catalog:', e);
            }
        }
        return false;
    }
}

// Instantiate global database
const windowDB = new Database();
window.DB = windowDB;

// Helper Auth Methods
window.AuthObj = {
    login: async function(email, password) {
        console.log("Intentando login para:", email);
        const user = await window.DB.getUserByEmail(email);
        if (user) {
            console.log("Usuario encontrado en DB. Verificando password...");
            const hashedInput = await window.DB.hashPassword(password);
            
            if (user.password === hashedInput) {
                // Check if user is currently suspended
                if (user.suspension_end && new Date(user.suspension_end) > new Date()) {
                    const suspensionEnd = new Date(user.suspension_end);
                    const isPermanent = suspensionEnd.getFullYear() === 2100;
                    const blockText = isPermanent 
                        ? `<p class="mb-3 fw-bold text-danger fs-5">Tu cuenta ha sido bloqueada PERMANENTEMENTE.</p>`
                        : `<p class="mb-3 text-muted">Tu cuenta ha sido bloqueada hasta ${suspensionEnd.toLocaleDateString()}.</p>`;

                    const SwalConfig = {
                        icon: 'error',
                        title: 'Cuenta Suspendida', 
                        html: `
                            ${blockText}
                            <div class="p-3 bg-light rounded text-start mb-3 border">
                                <strong>Motivo:</strong><br>
                                ${user.suspension_reason || 'Infracción a las políticas'}
                            </div>
                            ${!isPermanent ? '<p class="small text-muted mb-0">¿Deseas enviar una carta de apelación al administrador?</p>' : ''}
                        `,
                        showCancelButton: true,
                        cancelButtonText: 'Cerrar',
                        confirmButtonColor: 'var(--primary-color)'
                    };

                    if (!isPermanent) {
                        SwalConfig.input = 'textarea';
                        SwalConfig.inputPlaceholder = 'Escribe aquí tu justificación o carta de perdón...';
                        SwalConfig.inputAttributes = { rows: 4 };
                        SwalConfig.confirmButtonText = 'Enviar Apelación';
                    } else {
                        SwalConfig.showConfirmButton = false;
                        SwalConfig.cancelButtonText = 'Aceptar y Salir';
                        SwalConfig.cancelButtonColor = '#dc3545';
                    }

                    const { isConfirmed, value } = await Swal.fire(SwalConfig);

                    if (!isPermanent && isConfirmed && value && user.suspended_by) {
                        try {
                            await window.DB.sendMessage({
                                sender_id: user.id,
                                receiver_id: user.suspended_by,
                                text: `[CARTA DE APELACIÓN]\n${value}`
                            });
                            window.showSuccessModal('Apelación Enviada', 'El administrador revisará tu caso pronto.');
                        } catch (err) {
                            window.showErrorModal('Error', 'No se pudo enviar la apelación: ' + err.message);
                        }
                    }

                    return false;
                }

                console.log("¡Login exitoso!");
                sessionStorage.setItem('current_user_id', user.id);
                sessionStorage.setItem('show_welcome_modal', 'true');
                return true;
            } else {
                console.warn("Mismatch de contraseñas.");
            }
        } else {
            console.warn("Usuario no encontrado en la base de datos.");
        }
        return false;
    },
    logout: function() {
        sessionStorage.removeItem('current_user_id');
        localStorage.removeItem('agrosmart_user_cache');
        window.location.href = 'index.html';
    },
    getCurrentUser: async function(forceRefresh = false) {
        const id = sessionStorage.getItem('current_user_id');
        if (!id) {
            localStorage.removeItem('agrosmart_user_cache');
            return null;
        }

        // Try to get from persistent cache first for instant UI response
        if (!forceRefresh) {
            let cached = localStorage.getItem('agrosmart_user_cache');
            if (cached) {
                try {
                    const userObj = JSON.parse(cached);
                    if (String(userObj.id) === String(id)) {
                        // Update in background but return cache immediately
                        this.refreshUserInBackground(id);
                        return userObj;
                    }
                } catch(e) { /* ignore parse error */ }
            }
        }

        return await this.refreshUser(id);
    },

    refreshUser: async function(id) {
        try {
            const user = await window.DB.getUserById(id);
            if (!user) {
                return { id: id, role: 'farmer', is_superuser: false, _isStub: true };
            }
            localStorage.setItem('agrosmart_user_cache', JSON.stringify(user));
            return user;
        } catch (e) {
            return { id: id, role: 'farmer', is_superuser: false, _isStub: true };
        }
    },

    refreshUserInBackground: async function(id) {
        if (!navigator.onLine) return; // Prevent background network noise
        try {
            const user = await window.DB.getUserById(id);
            if (user) {
                localStorage.setItem('agrosmart_user_cache', JSON.stringify(user));
            }
        } catch(e) {}
    },
    requireAuth: async function() {
        const user = await this.getCurrentUser();
        if (!user) {
            window.location.href = 'index.html';
            throw new Error("Auth required");
        }
        return user;
    },
    requireAdmin: async function() {
        const user = await this.getCurrentUser();
        const isAdminRole = ['global_owner', 'ministry_admin', 'org_admin'].includes(user?.role);
        if (!user || (!user.is_superuser && !isAdminRole)) {
            window.location.href = 'dashboard.html';
            throw new Error("Admin required");
        }
        return user;
    }
};
