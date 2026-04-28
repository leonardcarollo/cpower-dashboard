import { useState, useMemo, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import projects from './projects.json'
import './App.css'

const TECH_CONFIG = [
  { key: 'hasBESS', label: 'BESS', color: '#378ADD' },
  { key: 'hasBackupGen', label: 'Backup Gen', color: '#BA7517' },
  { key: 'hasExistingGen', label: 'Existing Gen', color: '#639922' },
  { key: 'hasFacilitiesDM', label: 'Facilities DM', color: '#534AB7' },
  { key: 'hasSolar', label: 'Solar', color: '#D85A30' },
]

const PER_PAGE = 15

function unique(arr, key) {
  return [...new Set(arr.map(r => r[key]).filter(Boolean))].sort()
}

export default function App() {
  const [search, setSearch] = useState('')
  const [iso, setIso] = useState('')
  const [phase, setPhase] = useState('')
  const [type, setType] = useState('')
  const [state, setState] = useState('')
  const [activeTechs, setActiveTechs] = useState(new Set())
  const [tab, setTab] = useState('table')
  const [page, setPage] = useState(0)

  const isoOptions = useMemo(() => unique(projects, 'iso'), [])
  const phaseOptions = useMemo(() => unique(projects, 'phase'), [])
  const typeOptions = useMemo(() => unique(projects, 'clientType'), [])
  const stateOptions = useMemo(() => unique(projects, 'state'), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return projects.filter(r => {
      if (q && !`${r.client} ${r.site} ${r.state} ${r.iso} ${r.utility} ${r.project}`.toLowerCase().includes(q)) return false
      if (iso && r.iso !== iso) return false
      if (phase && r.phase !== phase) return false
      if (type && r.clientType !== type) return false
      if (state && r.state !== state) return false
      for (const t of activeTechs) if (!r[t]) return false
      return true
    })
  }, [search, iso, phase, type, state, activeTechs])

  useEffect(() => { setPage(0) }, [filtered])

  const totalDemand = filtered.filter(r => r.site !== 'Enterprise').reduce((s, r) => s + r.peakDemand, 0)
  const totalBESS = filtered.reduce((s, r) => s + r.bessNameplate, 0)
  const totalSolar = filtered.reduce((s, r) => s + r.solarNameplate, 0)
  const clientCount = new Set(filtered.map(r => r.client)).size

  const toggleTech = (key) => {
    const next = new Set(activeTechs)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setActiveTechs(next)
  }

  return (
    <div className="app">
      <header>
        <h1>CPower Project Dashboard</h1>
        <p className="subtitle">Q1 update · 490 sites across 51 clients</p>
      </header>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Search client, site, state, ISO..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={iso} onChange={e => setIso(e.target.value)}>
          <option value="">All ISOs</option>
          {isoOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={phase} onChange={e => setPhase(e.target.value)}>
          <option value="">All phases</option>
          {phaseOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>
          {typeOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={state} onChange={e => setState(e.target.value)}>
          <option value="">All states</option>
          {stateOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="tech-pills">
        {TECH_CONFIG.map(t => {
          const count = projects.filter(r => r[t.key]).length
          const active = activeTechs.has(t.key)
          return (
            <button
              key={t.key}
              className={`pill ${active ? 'active' : ''}`}
              onClick={() => toggleTech(t.key)}
            >
              <span className="dot" style={{ background: t.color }} />
              {t.label}
              <span className="count-badge">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="metrics">
        <Metric label="Sites shown" value={filtered.length} sub={`of ${projects.length} total`} />
        <Metric label="Clients" value={clientCount} sub="unique" />
        <Metric label="Peak demand" value={`${(totalDemand / 1000).toFixed(1)} GW`} sub="nameplate" />
        <Metric label="BESS + Solar" value={`${((totalBESS + totalSolar) / 1000).toFixed(0)} MW`} sub="combined" />
      </div>

      <div className="tabs">
        {['table', 'clients', 'charts', 'map'].map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); setPage(0) }}
          >
            {t === 'table' ? 'Sites' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'table' && <SitesTable rows={filtered} page={page} setPage={setPage} />}
        {tab === 'clients' && <ClientsTable rows={filtered} page={page} setPage={setPage} />}
        {tab === 'charts' && <ChartsView rows={filtered} />}
        {tab === 'map' && <MapView rows={filtered} />}
      </div>

      <footer>
        <p>Data source: CPower Project List Q1 · Built for ENFRA Solutions</p>
      </footer>
    </div>
  )
}

function Metric({ label, value, sub }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  )
}

function phaseClass(p) {
  if (!p) return ''
  return 'phase-' + p.replace(/\s+/g, '')
}

function TechDots({ row }) {
  return (
    <span>
      {TECH_CONFIG.filter(t => row[t.key]).map(t => (
        <span
          key={t.key}
          className="tech-dot"
          style={{ background: t.color }}
          title={t.label}
        />
      ))}
    </span>
  )
}

function Pagination({ page, setPage, total }) {
  const totalPages = Math.ceil(total / PER_PAGE)
  return (
    <div className="pagination">
      <button onClick={() => setPage(page - 1)} disabled={page === 0}>← Prev</button>
      <span>Page {page + 1} of {totalPages || 1} · {total} rows</span>
      <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Next →</button>
    </div>
  )
}

function SitesTable({ rows, page, setPage }) {
  const start = page * PER_PAGE
  const slice = rows.slice(start, start + PER_PAGE)
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th><th>Site</th><th>State</th><th>ISO</th>
              <th>Peak kW</th><th>Phase</th><th>Tech</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i}>
                <td title={r.client}>{r.client}</td>
                <td title={r.site}>{r.site}</td>
                <td>{r.state || '—'}</td>
                <td>{r.iso || '—'}</td>
                <td>{r.peakDemand ? r.peakDemand.toLocaleString() : '—'}</td>
                <td>{r.phase ? <span className={`phase-badge ${phaseClass(r.phase)}`}>{r.phase}</span> : '—'}</td>
                <td><TechDots row={r} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={rows.length} />
    </>
  )
}

function ClientsTable({ rows, page, setPage }) {
  const clients = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!map[r.client]) {
        map[r.client] = { client: r.client, type: r.clientType, sites: 0, totalDemand: 0, states: new Set(), isos: new Set(), techs: new Set() }
      }
      const c = map[r.client]
      c.sites++
      c.totalDemand += r.peakDemand
      if (r.state) c.states.add(r.state)
      if (r.iso) c.isos.add(r.iso.split('/')[0])
      TECH_CONFIG.forEach(t => { if (r[t.key]) c.techs.add(t.label) })
    })
    return Object.values(map).sort((a, b) => b.totalDemand - a.totalDemand)
  }, [rows])

  const start = page * PER_PAGE
  const slice = clients.slice(start, start + PER_PAGE)

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Client</th><th>Type</th><th>Sites</th><th>States</th><th>ISO</th><th>Peak demand</th><th>Tech</th></tr>
          </thead>
          <tbody>
            {slice.map((c, i) => (
              <tr key={i}>
                <td><strong>{c.client}</strong></td>
                <td>{c.type}</td>
                <td>{c.sites}</td>
                <td>{[...c.states].join(', ') || '—'}</td>
                <td>{[...c.isos].join(', ') || '—'}</td>
                <td>{c.totalDemand ? `${(c.totalDemand / 1000).toFixed(1)} GW` : '—'}</td>
                <td className="small">{[...c.techs].join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={clients.length} />
    </>
  )
}

function ChartsView({ rows }) {
  const isoCount = {}
  rows.forEach(r => { if (r.iso) { const k = r.iso.split('/')[0]; isoCount[k] = (isoCount[k] || 0) + 1 } })
  const isoArr = Object.entries(isoCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const stateCount = {}
  rows.forEach(r => { if (r.state) stateCount[r.state] = (stateCount[r.state] || 0) + 1 })
  const stateArr = Object.entries(stateCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const techCounts = TECH_CONFIG.map(t => ({ ...t, count: rows.filter(r => r[t.key]).length }))

  const phaseCount = {}
  rows.forEach(r => { const k = r.phase || 'Unknown'; phaseCount[k] = (phaseCount[k] || 0) + 1 })
  const phaseArr = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])

  return (
    <div className="charts-grid">
      <BarChart title="Sites by ISO" data={isoArr} color="#378ADD" />
      <BarChart title="Sites by state (top 10)" data={stateArr} color="#1D9E75" />
      <BarChart title="Technology deployment" data={techCounts.map(t => [t.label, t.count])} colors={techCounts.map(t => t.color)} />
      <BarChart title="Pipeline phases" data={phaseArr} color="#7F77DD" />
    </div>
  )
}

function BarChart({ title, data, color, colors }) {
  const max = Math.max(...data.map(d => d[1]), 1)
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      {data.map(([k, v], i) => (
        <div className="bar-row" key={k}>
          <div className="bar-label">{k}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(v / max * 100).toFixed(1)}%`, background: colors ? colors[i] : color }}
            />
          </div>
          <div className="bar-val">{v}</div>
        </div>
      ))}
    </div>
  )
}

function MapView({ rows }) {
  const ref = useRef(null)

  useEffect(() => {
    const stateCount = {}
    rows.forEach(r => { if (r.state) stateCount[r.state] = (stateCount[r.state] || 0) + 1 })
    const isDark = matchMedia('(prefers-color-scheme: dark)').matches
    const maxV = Math.max(...Object.values(stateCount), 1)
    const color = d3.scaleSequential([0, maxV], d3.interpolateBlues)

    const stateFips = { AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55', WY: '56' }
    const stateByFips = {}
    Object.entries(stateFips).forEach(([s, f]) => { stateByFips[f] = s })

    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(us => {
      if (!ref.current) return
      const div = ref.current
      const w = div.offsetWidth || 700
      const h = 400
      d3.select(div).select('svg').remove()
      const svg = d3.select(div).append('svg').attr('viewBox', `0 0 ${w} ${h}`).style('width', '100%').style('height', '100%')
      const proj = d3.geoAlbersUsa().scale(w * 1.2).translate([w / 2, h / 2])
      const path = d3.geoPath(proj)
      const features = topojson.feature(us, us.objects.states).features

      svg.selectAll('path').data(features).join('path')
        .attr('d', path)
        .attr('stroke', isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)')
        .attr('stroke-width', 0.5)
        .attr('fill', d => {
          const fips = String(d.id).padStart(2, '0')
          const s = stateByFips[fips]
          const v = stateCount[s] || 0
          return v > 0 ? color(v) : (isDark ? '#2C2C2A' : '#E8E8E5')
        })
        .append('title').text(d => {
          const fips = String(d.id).padStart(2, '0')
          const s = stateByFips[fips]
          const v = stateCount[s] || 0
          return `${s || '?'}: ${v} site${v !== 1 ? 's' : ''}`
        })
    })
  }, [rows])

  return <div className="map-container" ref={ref} />
}
