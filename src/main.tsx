import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import App from './App.tsx';
import { Rfc5424Logger } from './infrastructure/logging/rfc5424Logger';
import { CsvExporter, XlsxExporter } from './infrastructure/export';
import {
  LocalStorageScenarioRepository,
  SupabaseScenarioRepository,
  SupabaseScenarioTableClient,
  ReliableScenarioRepository,
} from './infrastructure/persistence';
import { setLoanStoreLogger } from './presentation/state/loanStore';
import {
  setScenarioStoreLogger,
  setScenarioStoreRepository,
  useScenarioStore,
} from './presentation/state/scenarioStore';
import { setInvestmentStoreLogger } from './presentation/state/investmentStore';
import { setCsvExporter, setXlsxExporter } from './presentation/state/exporterRegistry';

// Composition root: único punto que conecta infraestructura con el store de
// presentación (Fase 0). El store no importa `infrastructure` directamente.
setLoanStoreLogger(new Rfc5424Logger());
setScenarioStoreLogger(new Rfc5424Logger());
setInvestmentStoreLogger(new Rfc5424Logger());
setCsvExporter(new CsvExporter());
setXlsxExporter(new XlsxExporter());

// Persistencia de comparaciones (ADR 0012, ADR 0013): local siempre
// disponible; Supabase se conecta solo si las variables de entorno están
// presentes, y nunca reemplaza a local — `ReliableScenarioRepository` cae a
// local en cualquier falla, así que la app nunca depende de que Supabase
// esté arriba.
const localScenarioRepository = new LocalStorageScenarioRepository();
const { VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_ANON_KEY: supabaseAnonKey } = import.meta.env;

if (supabaseUrl !== undefined && supabaseAnonKey !== undefined) {
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Auth anónima (sin pantalla de login): cada navegador obtiene un
  // auth.uid() estable para que las políticas RLS aíslen sus propios datos.
  // Si falla (offline, proyecto mal configurado), save()/findAll() fallarán
  // con "no autenticado" y ReliableScenarioRepository caerá a local — no rompe la app.
  void supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session === null) {
      void supabaseClient.auth.signInAnonymously();
    }
  });

  const supabaseScenarioRepository = new SupabaseScenarioRepository(
    new SupabaseScenarioTableClient(supabaseClient),
  );

  setScenarioStoreRepository(
    new ReliableScenarioRepository(supabaseScenarioRepository, localScenarioRepository, {
      onSyncStatusChange: (status) => {
        useScenarioStore.setState({ syncStatus: status });
      },
    }),
  );
} else {
  setScenarioStoreRepository(localScenarioRepository);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
