# Setup Primo Amministratore

Questa guida spiega come creare il primo account amministratore per accedere alla Fashion Dashboard.

## Prerequisiti

- Accesso al progetto Supabase: https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk

## Passaggi

### 1. Crea l'utente in Supabase Auth

1. Vai alla [Supabase Dashboard](https://supabase.com/dashboard/project/sbtkymupbjyikfwjeumk)
2. Clicca su **Authentication** nel menu laterale
3. Clicca su **Users**
4. Clicca **Add user** > **Create new user**
5. Inserisci:
   - **Email**: l'email dell'amministratore (es: admin@tuaazienda.com)
   - **Password**: una password sicura (minimo 6 caratteri)
   - **Auto Confirm User**: Attiva questa opzione
6. Clicca **Create user**
7. **IMPORTANTE**: Copia l'**UUID** dell'utente appena creato (visibile nella lista utenti)

### 2. Crea il profilo amministratore

1. Vai su **SQL Editor** nella Supabase Dashboard
2. Esegui questa query sostituendo i valori:

```sql
SELECT public.link_admin_profile(
    'UUID-DELL-UTENTE',  -- Sostituisci con l'UUID copiato al passo precedente
    'admin@tuaazienda.com',  -- L'email usata
    'Nome Amministratore'  -- Nome da visualizzare
);
```

Esempio concreto:
```sql
SELECT public.link_admin_profile(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'mario.rossi@azienda.com',
    'Mario Rossi'
);
```

3. Dovresti vedere una risposta con `"success": true`

### 3. Accedi alla Dashboard

1. Vai alla Fashion Dashboard (URL di deploy)
2. Inserisci email e password dell'utente creato
3. Ora sei loggato come amministratore!

## Gestione Utenti

Una volta loggato come admin, puoi:

- **Creare nuovi utenti** dal pannello "Gestione Utenti"
- **Assegnare ruoli**:
  - **Admin**: Accesso completo + gestione utenti
  - **Analyst**: Solo visualizzazione (Panoramica, Negozi, Online, Inventario, Ricerca Ordini, Analytics, OSS)
  - **Uploader**: Solo caricamento dati (Carica Vendite, Carica Ecommerce, Carica Inventario)
- **Reset password** per gli utenti esistenti
- **Visualizzare i log** delle attività

## Ruoli e Permessi

| Ruolo | Sezioni Accessibili |
|-------|---------------------|
| **Admin** | Tutte le sezioni + Gestione Utenti |
| **Analyst** | Panoramica, Negozi, Online, Inventario, Ricerca Ordini, Analytics, OSS |
| **Uploader** | Carica Vendite, Carica Ecommerce, Carica Inventario |

## Troubleshooting

### "Account non autorizzato" dopo il login

Se vedi questo errore, significa che l'utente esiste in Supabase Auth ma non ha un profilo in `user_profiles`. Esegui il passo 2 per creare il profilo.

### L'utente non può accedere a certe sezioni

Verifica che il ruolo assegnato sia corretto nel pannello "Gestione Utenti" > "Modifica".

### Password dimenticata

Un admin può reimpostare la password di qualsiasi utente dal pannello "Gestione Utenti" usando il pulsante con l'icona della chiave.






