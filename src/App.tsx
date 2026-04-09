import { useState, useMemo } from 'react';
import './App.css';
import dbJson from './data.json';
import type { AIApp, AICompany, AIModel } from './types';

// ─── TYPE AUGMENTATIONS FOR ENRICHED JSON ────────────────────────────────────
const db = dbJson as {
  types?: { name: string; nameCn?: string; sorting: number }[];
  outputs?: { name: string; nameCn?: string; sorting: number }[];
  apps: AIApp[];
  companies: AICompany[];
  models: AIModel[];
};

// ─── STATIC TRANSLATIONS DICTIONARY ─────────────────────────────────────────
const TITLES_DICT: Record<string, string> = {
  'Type': '类型',
  'Output': '输出',
  'Country': '国家',
  'Used by Apps': '相关应用',
  'Proprietary MODELS': '专属模型',
  'Apps': '应用',
  'Models': '模型',
  'APPS': '应用',
  'MODELS': '模型',
  'COMPANIES': '公司',
  'SEARCH...': '搜索...',
  'Intl Site →': '国际链接 →',
  'CN Site →': '国内链接 →',
};

type Language = 'en' | 'cn';
type Tab = 'Apps' | 'Models' | 'Companies';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Translate a static UI string */
function t(key: string, language: Language): string {
  return language === 'cn' ? (TITLES_DICT[key] ?? key) : key;
}

/** Resolve the display name of an item respecting language */
function displayName(item: { name: string; nameCn?: string }, language: Language): string {
  return language === 'cn' && item.nameCn ? item.nameCn : item.name;
}

/** Look up a company's Chinese name from the companies list */
function companyDisplayName(companyEnName: string, language: Language): string {
  if (language !== 'cn') return companyEnName;
  const found = db.companies.find(c => c.name === companyEnName);
  return (found?.nameCn) ? found.nameCn : companyEnName;
}

/** Country name translations */
const COUNTRY_DICT: Record<string, string> = {
  'China': '中国',
  'USA': '美国',
};

function countryDisplay(country: string, language: Language): string {
  return language === 'cn' ? (COUNTRY_DICT[country] ?? country) : country;
}

/** Translate a type string (e.g. "General Assistant" → "通用助手") */
function typeDisplay(typeName: string, language: Language): string {
  if (language !== 'cn') return typeName;
  const found = db.types?.find(t => t.name === typeName);
  return found?.nameCn ?? typeName;
}

/** Translate an output string (e.g. "Text" → "文字") */
function outputDisplay(outputName: string, language: Language): string {
  if (language !== 'cn') return outputName;
  const found = db.outputs?.find(o => o.name === outputName);
  return found?.nameCn ?? outputName;
}

// ─── APP COMPONENT ────────────────────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Apps');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<Language>('en');

  // Dynamic filters based on active tab
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedOutputs, setSelectedOutputs] = useState<Set<string>>(new Set());

  // Aggregate possibilities for filters (keyed by English, displayed per language)
  const allTypes = useMemo(() => {
    if (db.types) {
      return [...db.types].sort((a, b) => a.sorting - b.sorting);
    }
    return Array.from(new Set(db.apps.map(a => a.type).filter(Boolean)))
      .sort()
      .map(name => ({ name, nameCn: undefined, sorting: 0 }));
  }, []);

  const allCountries = useMemo(() => {
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.map(a => a.country);
    else if (activeTab === 'Companies') list = db.companies.map(c => c.country);
    else list = db.models.map(m => m.country);
    return Array.from(new Set(list.filter(Boolean))).sort();
  }, [activeTab]);

  const allOutputs = useMemo(() => {
    if (db.outputs) {
      return [...db.outputs].sort((a, b) => a.sorting - b.sorting);
    }
    let list: string[] = [];
    if (activeTab === 'Apps') list = db.apps.flatMap(a => a.outputs);
    else if (activeTab === 'Models') list = db.models.flatMap(m => m.outputs);
    return Array.from(new Set(list.filter(Boolean)))
      .sort()
      .map(name => ({ name, nameCn: undefined, sorting: 0 }));
  }, [activeTab]);

  // ─── TAB + FILTER HANDLERS ──────────────────────────────────────────────────

  const handleTabSwitch = (tab: Tab) => {
    setActiveTab(tab);
    setSearch('');
    setSelectedTypes(new Set());
    setSelectedCountries(new Set());
    setSelectedOutputs(new Set());
  };

  const toggleFilter = (set: Set<string>, val: string, updateFn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    updateFn(next);
  };

  // ─── FILTERING WITH CROSS-LINGUAL SEARCH ────────────────────────────────────

  const filteredApps = useMemo(() => {
    const q = search.toLowerCase();
    return db.apps.filter(item => {
      const companyObj = db.companies.find(c => c.name === item.company);
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false) ||
        item.company.toLowerCase().includes(q) ||
        (companyObj?.nameCn?.toLowerCase().includes(q) ?? false);
      const matchType = selectedTypes.size === 0 || selectedTypes.has(item.type);
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      const matchOutput = selectedOutputs.size === 0 || item.outputs.some(o => selectedOutputs.has(o));
      return matchSearch && matchType && matchCountry && matchOutput;
    });
  }, [search, selectedTypes, selectedCountries, selectedOutputs]);

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();
    return db.companies.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false);
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      return matchSearch && matchCountry;
    });
  }, [search, selectedCountries]);

  const filteredModels = useMemo(() => {
    const q = search.toLowerCase();
    return db.models.filter(item => {
      const companyObj = db.companies.find(c => c.name === item.company);
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        (item.nameCn?.toLowerCase().includes(q) ?? false) ||
        item.company.toLowerCase().includes(q) ||
        (companyObj?.nameCn?.toLowerCase().includes(q) ?? false);
      const matchCountry = selectedCountries.size === 0 || selectedCountries.has(item.country);
      const matchOutput = selectedOutputs.size === 0 || item.outputs.some(o => selectedOutputs.has(o));
      return matchSearch && matchCountry && matchOutput;
    });
  }, [search, selectedCountries, selectedOutputs]);

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="title-group">
          <h1>AI Navigator</h1>
        </div>

        <input
          id="search-input"
          type="text"
          className="search-box brutal-shadow"
          placeholder={t('SEARCH...', language)}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {(activeTab === 'Apps' || activeTab === 'Models' || activeTab === 'Companies') && (
          <FilterSection
            title={t('Country', language)}
            options={allCountries.map(c => ({ value: c, label: countryDisplay(c, language) }))}
            selected={selectedCountries}
            onChange={(val) => toggleFilter(selectedCountries, val, setSelectedCountries)}
          />
        )}

        {(activeTab === 'Apps' || activeTab === 'Models') && (
          <FilterSection
            title={t('Output', language)}
            options={allOutputs.map(o => ({ value: o.name, label: language === 'cn' && o.nameCn ? o.nameCn : o.name }))}
            selected={selectedOutputs}
            onChange={(val) => toggleFilter(selectedOutputs, val, setSelectedOutputs)}
          />
        )}

        {activeTab === 'Apps' && (
          <FilterSection
            title={t('Type', language)}
            options={allTypes.map(tp => ({ value: tp.name, label: language === 'cn' && tp.nameCn ? tp.nameCn : tp.name }))}
            selected={selectedTypes}
            onChange={(val) => toggleFilter(selectedTypes, val, setSelectedTypes)}
          />
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header">
          <div className="tab-group">
            <button
              id="tab-apps"
              className={`tab-btn ${activeTab === 'Apps' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Apps')}
            >
              {t('APPS', language)} ({filteredApps.length})
            </button>
            <button
              id="tab-models"
              className={`tab-btn ${activeTab === 'Models' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Models')}
            >
              {t('MODELS', language)} ({filteredModels.length})
            </button>
            <button
              id="tab-companies"
              className={`tab-btn ${activeTab === 'Companies' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('Companies')}
            >
              {t('COMPANIES', language)} ({filteredCompanies.length})
            </button>
          </div>
          {/* Language Toggle — top right */}
          <div className="lang-toggle" role="group" aria-label="Language toggle">
            <button
              id="lang-en"
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              id="lang-cn"
              className={`lang-btn ${language === 'cn' ? 'active' : ''}`}
              onClick={() => setLanguage('cn')}
            >
              中文
            </button>
          </div>
        </header>

        <section className="grid-container">
          {activeTab === 'Apps' && filteredApps.map(app => (
            <AppCard key={app.name} app={app} language={language} />
          ))}
          {activeTab === 'Models' && filteredModels.map(model => (
            <ModelCard key={model.name} model={model} language={language} />
          ))}
          {activeTab === 'Companies' && filteredCompanies.map(company => (
            <CompanyCard key={company.name} company={company} language={language} />
          ))}
        </section>
      </main>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

interface FilterOption { value: string; label: string; }

function FilterSection({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (val: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="filter-group">
      <h3 className="filter-title">{title}</h3>
      {options.map(opt => (
        <label key={opt.value} className="filter-label">
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={selected.has(opt.value)}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function PillList({ items, translate }: { items: string[]; translate?: (s: string) => string }) {
  if (!items || items.length === 0) return <span className="data-value">-</span>;
  return (
    <div className="pill-group">
      {items.map(m => <span key={m} className="pill">{translate ? translate(m) : m}</span>)}
    </div>
  );
}

function AppCard({ app, language }: { app: AIApp; language: Language }) {
  const companyLabel = companyDisplayName(app.company, language);
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(app, language)}</h2>
        <div className="card-subtitle">{companyLabel} &bull; {countryDisplay(app.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('Type', language)}</span>
          <PillList items={app.type ? [app.type] : []} translate={s => typeDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Output', language)}</span>
          <PillList items={app.outputs} translate={s => outputDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Proprietary MODELS', language)}</span>
          <PillList items={app.models} />
        </div>
      </div>
      <div className="card-footer">
        {app.linkIntl && (
          <a href={app.linkIntl} target="_blank" rel="noreferrer" className="link-btn">{t('Intl Site →', language)}</a>
        )}
        {app.linkCn && (
          <a href={app.linkCn} target="_blank" rel="noreferrer" className="link-btn" style={{ marginLeft: '8px' }}>{t('CN Site →', language)}</a>
        )}
      </div>
    </article>
  );
}

function ModelCard({ model, language }: { model: AIModel; language: Language }) {
  const companyLabel = companyDisplayName(model.company, language);
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(model, language)}</h2>
        <div className="card-subtitle">{companyLabel} &bull; {countryDisplay(model.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('Output', language)}</span>
          <PillList items={model.outputs} translate={s => outputDisplay(s, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Used by Apps', language)}</span>
          <PillList items={model.apps} translate={s => displayName({ name: s, nameCn: db.apps.find(a => a.name === s)?.nameCn }, language)} />
        </div>
      </div>
    </article>
  );
}

function CompanyCard({ company, language }: { company: AICompany; language: Language }) {
  return (
    <article className="card">
      <div className="card-header">
        <h2 className="card-title">{displayName(company, language)}</h2>
        <div className="card-subtitle">{countryDisplay(company.country, language)}</div>
      </div>
      <div className="card-body">
        <div className="data-row">
          <span className="data-label">{t('Apps', language)}</span>
          <PillList items={company.apps} translate={s => displayName({ name: s, nameCn: db.apps.find(a => a.name === s)?.nameCn }, language)} />
        </div>
        <div className="data-row">
          <span className="data-label">{t('Models', language)}</span>
          <PillList items={company.models} />
        </div>
      </div>
    </article>
  );
}

export default App;
