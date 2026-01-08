// Auth routes - Native Deno for user management
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// CORS headers helper
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  };
}

// JSON response helper
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

// Helper: get current user from auth header and verify admin
async function verifyAdmin(req: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null, error: 'Token mancante' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { isAdmin: false, userId: null, error: 'Token non valido' };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, userId: user.id, error: 'Profilo non trovato' };
  }

  return { isAdmin: profile.role === 'admin', userId: user.id };
}

// GET /auth/users - List all users (admin only)
async function listUsers(req: Request): Promise<Response> {
  const { isAdmin, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get all user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 500);
  }

  // Get auth user details (email, last sign in, etc.)
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    return jsonResponse({ error: usersError.message }, 500);
  }

  // Merge profile data with auth user data
  const mergedUsers = profiles?.map(profile => {
    const authUser = users.find(u => u.id === profile.id);
    return {
      ...profile,
      last_sign_in_at: authUser?.last_sign_in_at,
      email_confirmed_at: authUser?.email_confirmed_at,
      created_at_auth: authUser?.created_at,
    };
  }) || [];

  return jsonResponse({ success: true, users: mergedUsers });
}

// POST /auth/users - Create new user (admin only)
async function createUser(req: Request): Promise<Response> {
  const { isAdmin, userId, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  const body = await req.json();
  const { email, password, display_name, role } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'Email e password sono obbligatori' }, 400);
  }

  if (!['admin', 'analyst', 'uploader'].includes(role)) {
    return jsonResponse({ error: 'Ruolo non valido' }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    return jsonResponse({ error: authError.message }, 400);
  }

  if (!authData.user) {
    return jsonResponse({ error: 'Errore nella creazione utente' }, 500);
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email,
      display_name: display_name || null,
      role,
      created_by: userId,
    });

  if (profileError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return jsonResponse({ error: profileError.message }, 500);
  }

  // Log activity
  await logActivity(supabase, userId!, 'create_user', { 
    created_user_id: authData.user.id,
    created_user_email: email,
    role 
  });

  return jsonResponse({ 
    success: true, 
    user: { 
      id: authData.user.id, 
      email, 
      display_name, 
      role 
    } 
  });
}

// PUT /auth/users/:id - Update user (admin only)
async function updateUser(req: Request, userId: string): Promise<Response> {
  const { isAdmin, userId: adminId, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  const body = await req.json();
  const { display_name, role } = body;

  if (role && !['admin', 'analyst', 'uploader'].includes(role)) {
    return jsonResponse({ error: 'Ruolo non valido' }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !currentProfile) {
    return jsonResponse({ error: 'Utente non trovato' }, 404);
  }

  // Prepare update data
  const updateData: any = {};
  if (display_name !== undefined) updateData.display_name = display_name;
  if (role !== undefined) updateData.role = role;

  if (Object.keys(updateData).length === 0) {
    return jsonResponse({ error: 'Nessun campo da aggiornare' }, 400);
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  // Log activity
  await logActivity(supabase, adminId!, 'update_user', { 
    updated_user_id: userId,
    changes: updateData,
    previous_role: currentProfile.role
  });

  return jsonResponse({ success: true });
}

// DELETE /auth/users/:id - Delete user (admin only)
async function deleteUser(req: Request, userId: string): Promise<Response> {
  const { isAdmin, userId: adminId, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  // Prevent self-deletion
  if (userId === adminId) {
    return jsonResponse({ error: 'Non puoi eliminare te stesso' }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get user info before deletion (for logging)
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('email, role')
    .eq('id', userId)
    .single();

  // Delete from auth (this will cascade to user_profiles due to foreign key)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  // Log activity
  await logActivity(supabase, adminId!, 'delete_user', { 
    deleted_user_id: userId,
    deleted_user_email: userProfile?.email,
    deleted_user_role: userProfile?.role
  });

  return jsonResponse({ success: true });
}

// POST /auth/users/:id/reset-password - Reset user password (admin only)
async function resetPassword(req: Request, userId: string): Promise<Response> {
  const { isAdmin, userId: adminId, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  const body = await req.json();
  const { new_password } = body;

  if (!new_password || new_password.length < 6) {
    return jsonResponse({ error: 'La password deve avere almeno 6 caratteri' }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get user email for logging
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single();

  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    { password: new_password }
  );

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  // Log activity
  await logActivity(supabase, adminId!, 'reset_password', { 
    target_user_id: userId,
    target_user_email: userProfile?.email
  });

  return jsonResponse({ success: true });
}

// GET /auth/activity-logs - Get activity logs (admin only)
async function getActivityLogs(req: Request): Promise<Response> {
  const { isAdmin, error } = await verifyAdmin(req);
  
  if (!isAdmin) {
    return jsonResponse({ error: error || 'Non autorizzato' }, 403);
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get logs
  const { data: logs, error: logsError, count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (logsError) {
    return jsonResponse({ error: logsError.message }, 500);
  }

  // Get user profiles to merge
  const userIds = [...new Set((logs || []).map(log => log.user_id))];
  
  let profilesMap: Record<string, { email: string; display_name: string | null }> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', userIds);
    
    if (profiles) {
      profilesMap = profiles.reduce((acc, p) => {
        acc[p.id] = { email: p.email, display_name: p.display_name };
        return acc;
      }, {} as Record<string, { email: string; display_name: string | null }>);
    }
  }

  // Merge logs with user info
  const logsWithUsers = (logs || []).map(log => ({
    ...log,
    user_profiles: profilesMap[log.user_id] || null
  }));

  return jsonResponse({ 
    success: true, 
    logs: logsWithUsers,
    total: count || 0,
    limit,
    offset
  });
}

// POST /auth/log-activity - Log user activity (authenticated users)
async function logUserActivity(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Non autorizzato' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return jsonResponse({ error: 'Token non valido' }, 401);
  }

  const body = await req.json();
  const { action, details, user_agent } = body;

  if (!action) {
    return jsonResponse({ error: 'Azione mancante' }, 400);
  }

  await logActivity(supabase, user.id, action, details, user_agent);

  return jsonResponse({ success: true });
}

// Helper function to log activity
async function logActivity(
  supabase: any, 
  userId: string, 
  action: string, 
  details?: any,
  userAgent?: string
): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      details: details || null,
      user_agent: userAgent || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// GET /auth/me - Get current user profile
async function getCurrentUser(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Non autorizzato' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return jsonResponse({ error: 'Token non valido' }, 401);
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: 'Profilo non trovato' }, 404);
  }

  return jsonResponse({ success: true, user: profile });
}

// Main router for auth routes
export async function handleAuthRoutes(req: Request, path: string, method: string): Promise<Response> {
  // Remove /auth prefix
  const subPath = path.replace('/auth', '') || '/';

  // GET /auth/me - Current user profile
  if (subPath === '/me' && method === 'GET') {
    return getCurrentUser(req);
  }

  // GET /auth/users - List users
  if (subPath === '/users' && method === 'GET') {
    return listUsers(req);
  }

  // POST /auth/users - Create user
  if (subPath === '/users' && method === 'POST') {
    return createUser(req);
  }

  // PUT /auth/users/:id - Update user
  const updateMatch = subPath.match(/^\/users\/([a-zA-Z0-9-]+)$/);
  if (updateMatch && method === 'PUT') {
    return updateUser(req, updateMatch[1]);
  }

  // DELETE /auth/users/:id - Delete user
  if (updateMatch && method === 'DELETE') {
    return deleteUser(req, updateMatch[1]);
  }

  // POST /auth/users/:id/reset-password - Reset password
  const resetMatch = subPath.match(/^\/users\/([a-zA-Z0-9-]+)\/reset-password$/);
  if (resetMatch && method === 'POST') {
    return resetPassword(req, resetMatch[1]);
  }

  // GET /auth/activity-logs - Activity logs
  if (subPath === '/activity-logs' && method === 'GET') {
    return getActivityLogs(req);
  }

  // POST /auth/log-activity - Log activity
  if (subPath === '/log-activity' && method === 'POST') {
    return logUserActivity(req);
  }

  return jsonResponse({ error: 'Route non trovata' }, 404);
}



