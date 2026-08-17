import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Rfc5424Logger } from './infrastructure/logging/rfc5424Logger';
import { CsvExporter, XlsxExporter } from './infrastructure/export';
import { setLoanStoreLogger } from './presentation/state/loanStore';
import { setScenarioStoreLogger } from './presentation/state/scenarioStore';
import { setInvestmentStoreLogger } from './presentation/state/investmentStore';
import { setCsvExporter, setXlsxExporter } from './presentation/state/exporterRegistry';

// Composition root: único punto que conecta infraestructura con el store de
// presentación (Fase 0). El store no importa `infrastructure` directamente.
setLoanStoreLogger(new Rfc5424Logger());
setScenarioStoreLogger(new Rfc5424Logger());
setInvestmentStoreLogger(new Rfc5424Logger());
setCsvExporter(new CsvExporter());
setXlsxExporter(new XlsxExporter());

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
