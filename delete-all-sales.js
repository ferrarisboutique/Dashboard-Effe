#!/usr/bin/env node

/**
 * Script per cancellare TUTTE le vendite dal database
 * Uso: node delete-all-sales.js
 */

const PROJECT_ID = 'sbtkymupbjyikfwjeumk';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidGt5bXVwYmp5aWtmd2pldW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDA0MTUsImV4cCI6MjA3NDQ3NjQxNX0.ONl5r0x89QJKQtP9jttBkvESpV6lDpc1ijydxtP7nzo';
const API_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-49468be0`;

async function getAllSales() {
  console.log('📊 Recupero tutte le vendite...');
  
  const response = await fetch(`${API_BASE}/sales`, {
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`✅ Trovate ${result.data.length} vendite`);
    return result.data;
  } else {
    throw new Error(`Errore nel recupero: ${result.error}`);
  }
}

async function deleteSale(saleId) {
  const response = await fetch(`${API_BASE}/sales/${saleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  
  const result = await response.json();
  return result.success;
}

async function deleteAllSales() {
  try {
    // 1. Recupera tutte le vendite
    const sales = await getAllSales();
    
    if (sales.length === 0) {
      console.log('✅ Nessuna vendita da cancellare!');
      return;
    }
    
    console.log(`\n⚠️  ATTENZIONE: Sto per cancellare ${sales.length} vendite!`);
    console.log('⏳ Inizio cancellazione...\n');
    
    let deleted = 0;
    let failed = 0;
    
    // 2. Cancella ogni vendita usando la KEY corretta
    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];
      // Usa il KEY dal KV store, non l'ID interno
      const saleKey = sale.key || sale.id;
      
      try {
        const success = await deleteSale(saleKey);
        
        if (success) {
          deleted++;
          if (deleted % 50 === 0) {
            console.log(`✅ Cancellate ${deleted}/${sales.length} vendite...`);
          }
        } else {
          failed++;
          console.error(`❌ Errore cancellazione vendita ${saleKey}`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Errore vendita ${saleKey}:`, error.message);
      }
      
      // Piccola pausa per non sovraccaricare il server
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ COMPLETATO!`);
    console.log(`   Cancellate: ${deleted}`);
    console.log(`   Fallite: ${failed}`);
    console.log('='.repeat(50));
    
    // 3. Verifica finale
    console.log('\n🔍 Verifica finale...');
    const remaining = await getAllSales();
    console.log(`📊 Vendite rimanenti: ${remaining.length}`);
    
    if (remaining.length === 0) {
      console.log('\n🎉 DATABASE PULITO! Tutte le vendite sono state cancellate.');
    } else {
      console.log(`\n⚠️  Attenzione: ${remaining.length} vendite ancora presenti. Riprova lo script.`);
    }
    
  } catch (error) {
    console.error('\n❌ ERRORE:', error.message);
    process.exit(1);
  }
}

// Esegui lo script
console.log('🧹 Script di Pulizia Database - Cancellazione Vendite');
console.log('='.repeat(50));
deleteAllSales();

