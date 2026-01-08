import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, UserProfile, UserRole, ActivityLog } from '../lib/supabase';
import { ROLE_NAMES, SECTION_NAMES, ROLE_PERMISSIONS } from '../hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Key, 
  Shield, 
  Clock, 
  Activity,
  Loader2,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface UserWithMeta extends UserProfile {
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

interface ActivityLogWithUser extends ActivityLog {
  user_profiles?: {
    email: string;
    display_name: string | null;
  };
}

export function AdminPanel() {
  const { session, profile } = useAuth();
  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [logs, setLogs] = useState<ActivityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('analyst');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('analyst');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: authHeaders,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel caricamento utenti');
      }
      
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Fetch activity logs
  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/activity-logs?limit=100`, {
        headers: authHeaders,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore nel caricamento logs');
      }
      
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [fetchUsers, fetchLogs]);

  // Create user
  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email e password sono obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          display_name: newUserDisplayName || null,
          role: newUserRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella creazione utente');
      }

      toast.success('Utente creato con successo');
      setCreateDialogOpen(false);
      resetCreateForm();
      fetchUsers();
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          display_name: editDisplayName || null,
          role: editRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'aggiornamento utente');
      }

      toast.success('Utente aggiornato con successo');
      setEditDialogOpen(false);
      fetchUsers();
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'eliminazione utente');
      }

      toast.success('Utente eliminato con successo');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('Inserisci la nuova password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nel reset password');
      }

      toast.success('Password reimpostata con successo');
      setResetPasswordDialogOpen(false);
      setNewPassword('');
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserDisplayName('');
    setNewUserRole('analyst');
  };

  const openEditDialog = (user: UserWithMeta) => {
    setSelectedUser(user);
    setEditDisplayName(user.display_name || '');
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithMeta) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const openResetPasswordDialog = (user: UserWithMeta) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const openPermissionsDialog = (user: UserWithMeta) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'analyst': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'uploader': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'logout': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'create_user': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'delete_user': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'update_user': return <Pencil className="w-4 h-4 text-orange-500" />;
      case 'reset_password': return <Key className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Gestione Utenti
          </h2>
          <p className="text-muted-foreground">
            Gestisci gli account utente e i permessi di accesso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchLogs(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <Button onClick={() => { console.log('Button clicked, opening dialog'); setCreateDialogOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Create User Modal - Simple implementation */}
      {createDialogOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999 }}
        >
          <div 
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
            onClick={() => setCreateDialogOpen(false)}
          />
          <div 
            className="relative w-full max-w-lg rounded-lg p-6 shadow-2xl mx-4"
            style={{ 
              zIndex: 100000, 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb'
            }}
          >
            <button 
              onClick={() => setCreateDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
              style={{ color: '#000' }}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#000' }}>Crea Nuovo Utente</h2>
              <p className="text-sm" style={{ color: '#666' }}>
                Inserisci i dati per creare un nuovo account utente
              </p>
            </div>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="email@esempio.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Minimo 6 caratteri"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-displayName">Nome Visualizzato</Label>
                <Input
                  id="create-displayName"
                  placeholder="Nome e Cognome"
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Ruolo</Label>
                <select 
                  id="create-role"
                  value={newUserRole} 
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ backgroundColor: '#fff', color: '#000' }}
                >
                  <option value="admin">Amministratore</option>
                  <option value="analyst">Analista</option>
                  <option value="uploader">Uploader</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateUser} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crea Utente
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utenti ({users.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Log Attività
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead>Creato il</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.display_name || user.email}</p>
                          {user.display_name && (
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                          {ROLE_NAMES[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.last_sign_in_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPermissionsDialog(user)}
                            title="Visualizza Permessi"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            title="Modifica"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openResetPasswordDialog(user)}
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          {user.id !== profile?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(user)}
                              title="Elimina"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Log Attività
              </CardTitle>
              <CardDescription>
                Storico delle attività degli utenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna attività registrata
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="mt-0.5">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {log.user_profiles?.display_name || log.user_profiles?.email || 'Utente'}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {log.details && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
            <DialogDescription>
              Modifica i dati dell'utente {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Nome Visualizzato</Label>
              <Input
                id="editDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Ruolo</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleUpdateUser} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal - Custom CSS */}
      {deleteDialogOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999 }}
        >
          <div 
            className="fixed inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
            onClick={() => setDeleteDialogOpen(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-lg p-6 shadow-2xl mx-4"
            style={{ 
              zIndex: 100000, 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb'
            }}
          >
            <button 
              onClick={() => setDeleteDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
              style={{ color: '#000' }}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: '#000' }}>Elimina Utente</h2>
              <p className="text-sm mt-2" style={{ color: '#666' }}>
                Sei sicuro di voler eliminare l'utente <strong>{selectedUser?.email}</strong>?
                <br />
                Questa azione non può essere annullata.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Imposta una nuova password per {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nuova Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimo 6 caratteri"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleResetPassword} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reimposta Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Permessi Utente</DialogTitle>
            <DialogDescription>
              Sezioni accessibili per {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className={getRoleBadgeColor(selectedUser?.role || 'analyst')}>
                {ROLE_NAMES[selectedUser?.role || 'analyst']}
              </Badge>
            </div>
            <div className="space-y-2">
              {selectedUser && ROLE_PERMISSIONS[selectedUser.role]?.map((sectionId) => (
                <div key={sectionId} className="flex items-center gap-2 py-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{SECTION_NAMES[sectionId] || sectionId}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPermissionsDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



