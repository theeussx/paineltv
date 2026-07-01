import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const QUICK_APPS = ['youtube', 'netflix', 'spotify', 'prime'];

function App() {
  const [tvs, setTvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', brand: 'samsung', ip: '', mac: '' });
  const [scanResults, setScanResults] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [apps, setApps] = useState([]);

  const loadTvs = async () => {
    try {
      setLoading(true);
      const data = await api.listTvs();
      setTvs(data.tvs || []);
      if (!selectedId && (data.tvs || []).length) setSelectedId(data.tvs[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTvs();
    api.apps().then((data) => setApps(Object.keys(data.apps || {}))).catch(() => {});
  }, []);

  const selectedTv = useMemo(() => tvs.find((tv) => tv.id === selectedId) || null, [tvs, selectedId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.addTv(form);
      setForm({ name: '', brand: 'samsung', ip: '', mac: '' });
      await loadTvs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScan = async () => {
    try {
      const data = await api.scan();
      setScanResults(data.found || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAction = async (fn) => {
    if (!selectedTv) return;
    try {
      await fn(selectedTv.id);
      await loadTvs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkPower = async (action) => {
    try {
      await api.bulkPower(action);
      await loadTvs();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Painel TV</p>
          <h1>Controle remoto e gestão de TVs Samsung</h1>
        </div>
        <button className="ghost" onClick={() => loadTvs()}>Atualizar</button>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="panel grid">
        <div>
          <h2>Adicionar TV</h2>
          <form onSubmit={handleAdd} className="stack">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da TV" required />
            <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              <option value="samsung">Samsung</option>
            </select>
            <input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="IP local" required />
            <input value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} placeholder="MAC (opcional)" />
            <button type="submit">Salvar TV</button>
          </form>

          <div className="stack">
            <button onClick={handleScan}>Buscar TVs na rede</button>
            <div className="scan-list">
              {scanResults.map((item) => (
                <button key={item.ip} className="scan-item" onClick={() => setForm({ ...form, ip: item.ip, name: `TV ${item.ip.split('.').pop()}` })}>
                  {item.ip}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2>TVs cadastradas</h2>
          {loading ? <p>Carregando...</p> : null}
          <div className="cards">
            {tvs.map((tv) => (
              <button key={tv.id} className={`card ${selectedTv?.id === tv.id ? 'active' : ''}`} onClick={() => setSelectedId(tv.id)}>
                <strong>{tv.name}</strong>
                <span>{tv.brand}</span>
                <small>{tv.ip}</small>
                <small>{tv.status || 'unknown'}</small>
              </button>
            ))}
          </div>
          <div className="bulk-actions">
            <button onClick={() => handleBulkPower('on')}>Ligar todas</button>
            <button onClick={() => handleBulkPower('off')}>Desligar todas</button>
          </div>
        </div>
      </section>

      <section className="panel remote-panel">
        <div className="remote-header">
          <div>
            <p className="eyebrow">Controle</p>
            <h2>{selectedTv ? selectedTv.name : 'Selecione uma TV'}</h2>
          </div>
          {selectedTv ? (
            <div className="actions-row">
              <button onClick={() => handleAction((id) => api.getToken(id))}>Buscar / salvar token</button>
              <button onClick={() => handleAction((id) => api.powerToggle(id))}>Power</button>
            </div>
          ) : null}
        </div>

        {selectedTv ? (
          <>
            <div className="remote-grid">
              <button onClick={() => handleAction((id) => api.nav(id, 'up'))}>▲</button>
              <button onClick={() => handleAction((id) => api.powerOff(id))}>Off</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'home'))}>Home</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'left'))}>◀</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'enter'))}>OK</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'right'))}>▶</button>
              <button onClick={() => handleAction((id) => api.volume(id, 'down'))}>Vol -</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'back'))}>Back</button>
              <button onClick={() => handleAction((id) => api.volume(id, 'up'))}>Vol +</button>
              <button onClick={() => handleAction((id) => api.nav(id, 'source'))}>Source</button>
              <button onClick={() => handleAction((id) => api.volume(id, 'mute'))}>Mute</button>
              <button onClick={() => handleAction((id) => api.powerOn(id))}>On</button>
            </div>

            <div className="app-row">
              {QUICK_APPS.map((app) => (
                <button key={app} onClick={() => handleAction((id) => api.openApp(id, app))}>
                  {app}
                </button>
              ))}
            </div>
            <div className="app-row">
              {apps.slice(0, 8).map((app) => (
                <button key={app} onClick={() => handleAction((id) => api.openApp(id, app))}>
                  {app}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export default App;
