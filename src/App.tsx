import { useState, useMemo } from 'react';
import './App.css';
import db from './data.json';
import type { AIApp, AICompany, AIModel } from './types';

type Tab = 'Apps' | 'Models' | 'Companies';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Apps');
  const [search, setSearch] = useState('');
  
  // Dynamic filters based on active tab
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set());

  // Aggregate possibilities for filters
  const allTypes = useMemo(() => Array.from(new Set(db.apps.map(a => a.type).filter(Boolean))).sort(), []);
  const allCountries = useMemo(() => {
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.map(a => a.country);
    else if (activeTab === 'Companies') list = db.companies.map(c => c.country);
    else list = db.models.map(m => m.country);
    return Array.from(new Set(list.filter(Boolean))).sort();
  }, [activeTab]);
  const allOutputs = useMemo(() => {
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.flatMap(a => a.outputs);
    else if (activeTab === 'Models') list = db.models.flatMap(m => m.outputs);
    return Array.from(new Set(list.filter(Boolean))).sort();
  }, [activeTab]);

  // Handle Tab Switch (reset filters)
  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSearch('');
    setSelectedTypes(new Set());
    setSelectedCountries(new Set());
    setSelectedOutputs(new Set());
  };

  // Toggle filter helper
  const toggleFilter = (set: Set<string>, val: string, updateFn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    updateFn(next);
  };

  // View Filtering logic
  const filteredApps = useMemo(() => {
    return db.apps.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.company.toLowerCase().includes(search.toLowerCase());
      const matchType = selectedTypes.size === 0 || selectedTypes.has(item.type);
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      const matchOutput = selectedOutputs.size === 0 || item.outputs.some(o => selectedOutputs.has(o));
      return matchSearch && matchType && matchCountry && matchOutput;
    });
  }, [search, selectedTypes, selectedCountries, selectedOutputs]);

  const filteredCompanies = useMemo(() => {
    return db.companies.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      return matchSearch && matchCountry;
    });
  }, [search, selectedCountries]);

  const filteredModels = useMemo(() => {
    return db.models.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.company.toLowerCase().includes(search.toLowerCase());
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      const matchOutput = selectedOutputs.size === 0 || item.outputs.some(o => selectedOutputs.has(o));
      return matchSearch && matchCountry && matchOutput;
    });
  }, [search, selectedCountries, selectedOutputs]);

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="title-group">
          <h1>DIRECTORY</h1>
        </div>

        <input
          type="text"
          className="search-box brutal-shadow"
          placeholder="SEARCH..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {activeTab === 'Apps' && (
          <FilterSection 
            title="Type" 
            options={allTypes} 
            selected={selectedTypes} 
            onChange={(val) => toggleFilter(selectedTypes, val, setSelectedTypes)} 
          />
        )}

        {(activeTab === 'Apps' || activeTab === 'Models' || activeTab === 'Companies') && (
          <FilterSection 
            title="Country" 
            options={allCountries} 
            selected={selectedCountries} 
            onChange={(val) => toggleFilter(selectedCountries, val, setSelectedCountries)} 
          />
        )}

        {(activeTab === 'Apps' || activeTab === 'Models') && (
          <FilterSection 
            title="Output" 
            options={allOutputs} 
            selected={selectedOutputs} 
            onChange={(val) => toggleFilter(selectedOutputs, val, setSelectedOutputs)} 
          />
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header">
          <div className="tab-group">
            <button className={`tab-btn ${activeTab === 'Apps' ? 'active' : ''}`} onClick={() => handleTabSwitch('Apps')}>
              APPS ({filteredApps.length})
            </button>
            <button className={`tab-btn ${activeTab === 'Models' ? 'active' : ''}`} onClick={() => handleTabSwitch('Models')}>
              MODELS ({filteredModels.length})
            </button>
            <button className={`tab-btn ${activeTab === 'Companies' ? 'active' : ''}`} onClick={() => handleTabSwitch('Companies')}>
              COMPANIES ({filteredCompanies.length})
            </button>
          </div>
        </header>

        <section className="grid-container">
          {activeTab === 'Apps' && filteredApps.map(app => <AppCard key={app.name} app={app} />)}
          {activeTab === 'Models' && filteredModels.map(model => <ModelCard key={model.name} model={model} />)}
          {activeTab === 'Companies' && filteredCompanies.map(company => <CompanyCard key={company.name} company={company} />)}
        </section>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FilterSection({ title, options, selected, onChange }: { title: string, options: string[], selected: Set<string>, onChange: (val: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="filter-group">
      <h3 className="filter-title">{title}</h3>
      {options.map(opt => (
        <label key={opt} className="filter-label">
          <input 
            type="checkbox" 
            className="filter-checkbox" 
            checked={selected.has(opt)} 
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <span className="data-value">-</span>;
  return (
    <div className="pill-group">
      {items.map(m => <span key={m} className="pill">{m}</span>)}
    </div>
  );
}

function AppCard({ app }: { app: AIApp }) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{app.name}</h2>
        <div className="card-subtitle">{app.company} &bull; {app.country}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">Type</span>
          <span className="data-value">{app.type || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">Proprietary Output</span>
          <PillList items={app.outputs} />
        </div>
        <div className="data-row">
          <span className="data-label">Models</span>
          <PillList items={app.models} />
        </div>
      </div>
      <div className="card-footer">
        {app.linkIntl && (
          <a href={app.linkIntl} target="_blank" rel="noreferrer" className="link-btn">Intl Site →</a>
        )}
        {app.linkCn && (
           <a href={app.linkCn} target="_blank" rel="noreferrer" className="link-btn" style={{marginLeft: '8px'}}>CN Site →</a>
        )}
      </div>
    </article>
  );
}

function ModelCard({ model }: { model: AIModel }) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{model.name}</h2>
        <div className="card-subtitle">{model.company} &bull; {model.country}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">Output</span>
          <PillList items={model.outputs} />
        </div>
        <div className="data-row">
          <span className="data-label">Used by Apps</span>
          <PillList items={model.apps} />
        </div>
      </div>
    </article>
  );
}

function CompanyCard({ company }: { company: AICompany }) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{company.name}</h2>
        <div className="card-subtitle">{company.country}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">Apps</span>
          <PillList items={company.apps} />
        </div>
        <div className="data-row">
          <span className="data-label">Models</span>
          <PillList items={company.models} />
        </div>
      </div>
    </article>
  );
}

export default App;
