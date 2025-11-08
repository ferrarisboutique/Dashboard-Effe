# Fix: Dialog Duplicati Non Funzionante

## Problema
Il pulsante "Visualizza duplicati" nella sezione "Carica Ecommerce" non mostrava il dialog con le righe duplicate rilevate durante l'elaborazione del file.

## Causa
Il componente `EcommerceDataUpload.tsx` aveva implementato controlli eccessivamente complessi per gestire l'apertura e chiusura del Dialog:
- Uso di `useRef` con timestamp per tracciare l'apertura del Dialog
- Controlli su `onInteractOutside` e `onPointerDownOutside` per prevenire la chiusura
- `useEffect` per il debug che poteva interferire con lo stato
- Event handlers con `preventDefault()` e `stopPropagation()` non necessari

Questi controlli, probabilmente aggiunti per risolvere problemi di chiusura immediata, creavano invece conflitti che impedivano l'apertura corretta del Dialog.

## Soluzione
Semplificato il componente rimuovendo tutti i controlli complessi e utilizzando l'approccio standard di Radix UI per i Dialog:

### Modifiche Applicate

1. **Rimosso `useRef` e `useEffect`** (righe 30-36):
```typescript
// PRIMA
const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
const dialogOpenTimestampRef = useRef<number | null>(null);

useEffect(() => {
  console.log('duplicatesDialogOpen changed:', duplicatesDialogOpen);
  console.log('uploadResult?.duplicates:', uploadResult?.duplicates);
}, [duplicatesDialogOpen, uploadResult?.duplicates]);

// DOPO
const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
```

2. **Semplificato onClick del Button** (righe 222-240):
```typescript
// PRIMA
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('Button clicked, opening dialog');
  dialogOpenTimestampRef.current = Date.now();
  setDuplicatesDialogOpen(true);
  console.log('Dialog open timestamp set:', dialogOpenTimestampRef.current);
}}

// DOPO
onClick={() => setDuplicatesDialogOpen(true)}
```

3. **Semplificato Dialog onOpenChange** (righe 393-407):
```typescript
// PRIMA
onOpenChange={(open) => {
  console.log('Dialog onOpenChange called with:', open);
  if (open) {
    dialogOpenTimestampRef.current = Date.now();
    console.log('Dialog opening, timestamp set:', dialogOpenTimestampRef.current);
  } else {
    dialogOpenTimestampRef.current = null;
    console.log('Dialog closing, timestamp cleared');
  }
  setDuplicatesDialogOpen(open);
}}

// DOPO
onOpenChange={setDuplicatesDialogOpen}
```

4. **Rimossi event handlers dal DialogContent** (righe 409-437):
```typescript
// PRIMA
<DialogContent 
  className="max-w-4xl max-h-[80vh] overflow-y-auto"
  onOpenAutoFocus={(e) => { ... }}
  onInteractOutside={(e) => { ... }}
  onPointerDownOutside={(e) => { ... }}
  onEscapeKeyDown={(e) => { ... }}
>

// DOPO
<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
```

## Risultato
Il Dialog ora si apre correttamente quando si clicca sul pulsante "Visualizza duplicati" e mostra l'elenco completo delle righe duplicate con:
- Numero di riga
- Tipo (Vendita/Reso)
- Documento
- Numero
- Data
- SKU
- Quantità
- Prezzo

## Test
Con il file `import_vendite_ecommerce_finoariga2000.xlsx` che contiene 12 righe duplicate, il sistema:
1. ✅ Rileva correttamente i 12 duplicati
2. ✅ Mostra il badge con il numero di duplicati
3. ✅ Rende visibile il pulsante "Visualizza duplicati"
4. ✅ Apre il Dialog quando si clicca sul pulsante
5. ✅ Visualizza tutte le 12 righe duplicate nella tabella

## File Modificati
- `src/components/EcommerceDataUpload.tsx`

## Note
La soluzione segue le best practices di Radix UI per i Dialog e rimuove complessità non necessaria. Il Dialog ora funziona in modo affidabile utilizzando solo lo stato React standard.
