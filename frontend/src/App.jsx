import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement 
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Activity, MousePointerClick, Users, Monitor, ExternalLink } from 'lucide-react';
import './index.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function App() {
  const [clicks, setClicks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clicksRes, analyticsRes] = await Promise.all([
          axios.get('https://gitlink-service.onrender.com/api/clicks'),
          axios.get('https://gitlink-service.onrender.com/api/analytics')
        ]);
        setClicks(clicksRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading Dashboard...</div>;
  }

  // Prepare Chart Data
  const browserData = {
    labels: analytics?.browserStats.map(b => b._id || 'Unknown') || [],
    datasets: [{
      data: analytics?.browserStats.map(b => b.count) || [],
      backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
      borderColor: '#1e293b',
      borderWidth: 2,
    }]
  };

  const deviceData = {
    labels: analytics?.deviceStats.map(d => d._id || 'Unknown') || [],
    datasets: [{
      label: 'Clicks by Device',
      data: analytics?.deviceStats.map(d => d.count) || [],
      backgroundColor: ['#6366f1', '#ec4899', '#14b8a6'],
      borderRadius: 4,
    }]
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>GitHub Link Tracker Dashboard</h1>
        <a 
          href="https://gitlink-service.onrender.com/github" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
        >
          Test Tracking Link <ExternalLink size={16} />
        </a>
      </header>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <MousePointerClick size={24} />
          </div>
          <div className="metric-info">
            <h3>Total Clicks</h3>
            <div className="value">{analytics?.totalClicks || 0}</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.2)' }}>
            <Activity size={24} />
          </div>
          <div className="metric-info">
            <h3>Today's Clicks</h3>
            <div className="value">{
              clicks.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length
            }</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.2)' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <h3>Unique IPs</h3>
            <div className="value">{new Set(clicks.map(c => c.ipAddress)).size}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)' }}>
            <Monitor size={24} />
          </div>
          <div className="metric-info">
            <h3>Top Device</h3>
            <div className="value">
              {analytics?.deviceStats.length > 0 
                ? analytics.deviceStats.sort((a,b) => b.count - a.count)[0]._id 
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Browsers</h3>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <Pie data={browserData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Devices</h3>
          <div style={{ height: '300px' }}>
            <Bar 
              data={deviceData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="table-card" style={{ overflowX: 'auto' }}>
        <h3>Recent Clicks</h3>
        <table style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Location & ISP</th>
              <th>IP Address</th>
              <th>Browser</th>
              <th>OS / Device</th>
              <th>Hardware Specs</th>
              <th>Referrer</th>
            </tr>
          </thead>
          <tbody>
            {clicks.slice(0, 15).map((click, index) => (
              <tr key={index}>
                <td>{new Date(click.timestamp).toLocaleString()}</td>
                <td>
                  {click.city && click.city !== 'Unknown' 
                    ? `${click.city}, ${click.country}` 
                    : 'Unknown Location'}
                  <br/>
                  <small style={{ color: '#94a3b8' }}>{click.isp}</small>
                </td>
                <td><span className="badge">{click.ipAddress === '::1' ? 'Localhost' : click.ipAddress}</span></td>
                <td>{click.browser} {click.browserVersion}</td>
                <td>{click.os} {click.osVersion} <br/><small style={{ color: '#94a3b8' }}>{click.device}</small></td>
                <td>
                  <small style={{ color: '#94a3b8', display: 'block', lineHeight: '1.4' }}>
                    {click.cpuCores ? <div>CPU: {click.cpuCores} Cores</div> : null}
                    {click.ram ? <div>RAM: ~{click.ram}GB</div> : null}
                    {click.gpu && click.gpu !== 'Unknown' ? <div>GPU: {click.gpu.substring(0, 25)}{click.gpu.length > 25 ? '...' : ''}</div> : null}
                    {click.screenResolution ? <div>Screen: {click.screenResolution}</div> : null}
                    {(!click.cpuCores && !click.ram && !click.gpu && !click.screenResolution) ? 'N/A' : null}
                  </small>
                </td>
                <td>{click.referrer}</td>
              </tr>
            ))}
            {clicks.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>No clicks recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
