# Fashion Performance Dashboard

Dashboard moderna e performante per il monitoraggio delle vendite e dell'inventario di negozi di moda.

## 🚀 Features

- **Gestione Vendite**: Monitora le vendite in tempo reale da tutti i canali (Negozio Donna, Negozio Uomo, E-commerce, Marketplace)
- **Inventario Dinamico**: Gestisci migliaia di prodotti con ricerca e filtri avanzati
- **Analytics Avanzate**: Visualizza trend, performance per brand e categorie
- **Upload Excel**: Importa dati di vendita e inventario direttamente da file Excel/CSV
- **Dashboard Responsive**: Interfaccia moderna costruita con React e Tailwind CSS

## 📋 Prerequisiti

- Node.js 18+ 
- npm o yarn
- Account Supabase (per database e edge functions)

## 🛠️ Installazione

```bash
# Clone il repository
git clone [your-repo-url]
cd Dashboard-Effe

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`

## 📦 Build per Produzione

```bash
npm run build
```

I file di produzione saranno generati nella cartella `build/`.

## 🗂️ Struttura del Progetto

```
Dashboard-Effe/
├── src/
│   ├── components/       # Componenti React
│   │   ├── ui/          # Componenti UI riutilizzabili
│   │   └── ...          # Altri componenti
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── supabase/        # Supabase edge functions
│   └── styles/          # Stili globali
├── build/               # File di produzione (generato)
└── package.json
```

## 💡 Utilizzo

### Caricamento Dati di Vendita

1. Vai alla sezione "Carica Vendite"
2. Carica un file Excel/CSV con le seguenti colonne:
   - Data
   - User (venditore)
   - SKU
   - Quantità
   - Prezzo
   - Canale (verrà mappato automaticamente)

### Caricamento Inventario

1. Vai alla sezione "Carica Inventario"
2. Carica un file Excel/CSV con le seguenti colonne:
   - SKU
   - Brand
   - Categoria (opzionale)
   - Prezzo d'acquisto
   - Prezzo di vendita
   - Collezione (opzionale)

## 🔧 Tecnologie Utilizzate

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Componenti UI
- **Recharts** - Grafici e visualizzazioni
- **Supabase** - Database e Edge Functions
- **Lucide React** - Icone

## 📊 Database

Il database è gestito tramite Supabase Edge Functions con supporto per:
- Gestione vendite con protezione duplicati
- Inventario illimitato (oltre 1000 righe)
- Paginazione e filtri lato server
- Chunked uploads per file grandi

## 🎨 Customizzazione

L'app utilizza Tailwind CSS per lo styling. Puoi personalizzare i colori e i temi modificando:
- `src/styles/globals.css` - Variabili CSS globali
- `tailwind.config.js` - Configurazione Tailwind (se presente)

## 🤝 Contributi

Contributi, issues e feature requests sono benvenuti!

## 📝 Licenza

Questo progetto è sotto licenza MIT - vedi il file [LICENSE](LICENSE) per i dettagli.

## 📧 Contatti

Per domande o supporto, contatta il team di sviluppo.

---

Made with ❤️ for Fashion Retail
