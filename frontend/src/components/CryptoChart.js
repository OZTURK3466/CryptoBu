import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const CryptoChart = ({ cryptoId, currentPrice }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchHistoricalData();
  }, [cryptoId, timeframe]);

  // Mettre à jour le prix en temps réel
  useEffect(() => {
    if (chartData && currentPrice && chartRef.current) {
      const chart = chartRef.current;
      const now = new Date();
      
      // Ajouter le nouveau point de prix
      chart.data.labels.push(now);
      chart.data.datasets[0].data.push(currentPrice);
      
      // Garder seulement les 100 derniers points pour éviter la surcharge
      if (chart.data.labels.length > 100) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      
      chart.update('none'); // Update sans animation pour plus de fluidité
    }
  }, [currentPrice, chartData]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/history/${cryptoId}?days=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.prices && data.prices.length > 0) {
        const formattedData = {
          labels: data.prices.map(price => new Date(price[0])),
          datasets: [
            {
              label: `Prix (USD)`,
              data: data.prices.map(price => price[1]),
              borderColor: '#00D4AA',
              backgroundColor: 'rgba(0, 212, 170, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#00D4AA',
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 2,
            },
          ],
        };
        setChartData(formattedData);
      } else {
        throw new Error('Aucune donnée de prix disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données historiques:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `${cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1)} - Évolution du Prix`,
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#FFFFFF',
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#00D4AA',
        borderColor: '#00D4AA',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Prix: $${context.parsed.y.toFixed(2)}`;
          },
          title: function(context) {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'dd/MM',
            week: 'dd/MM',
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: function(value) {
            return '$' + value.toFixed(2);
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
      },
      line: {
        tension: 0.4,
      },
    },
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0, 212, 170, 0.3)',
              borderTop: '4px solid #00D4AA',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span>Chargement du graphique...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="chart-controls">
          <div className="timeframe-buttons">
            {[
              { value: '1', label: '1J' },
              { value: '7', label: '7J' },
              { value: '30', label: '1M' },
              { value: '90', label: '3M' },
              { value: '365', label: '1A' },
            ].map(({ value, label }) => (
              <button
                key={value}
                className={`timeframe-btn ${timeframe === value ? 'active' : ''}`}
                onClick={() => setTimeframe(value)}
              >
                {label}
              </button>
            ))}
          </div>
          
          {currentPrice && (
            <div className="current-price">
              <span className="price-label">Prix actuel:</span>
              <span className="price-value">${currentPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="chart-wrapper">
          <div className="chart-error">
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '1rem',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3rem' }}>📊</div>
              <h3 style={{ color: '#EF4444', margin: 0 }}>Erreur de chargement</h3>
              <p style={{ color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
                {error}
              </p>
              <button
                onClick={() => fetchHistoricalData()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #00D4AA, #00E4BB)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginTop: '1rem'
                }}
              >
                🔄 Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-controls">
        <div className="timeframe-buttons">
          {[
            { value: '1', label: '1J' },
            { value: '7', label: '7J' },
            { value: '30', label: '1M' },
            { value: '90', label: '3M' },
            { value: '365', label: '1A' },
          ].map(({ value, label }) => (
            <button
              key={value}
              className={`timeframe-btn ${timeframe === value ? 'active' : ''}`}
              onClick={() => setTimeframe(value)}
            >
              {label}
            </button>
          ))}
        </div>
        
        {currentPrice && (
          <div className="current-price">
            <span className="price-label">Prix actuel:</span>
            <span className="price-value">${currentPrice.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      <div className="chart-wrapper">
        {chartData ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div className="chart-error">
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '3rem' }}>📊</div>
              <p style={{ color: '#9CA3AF' }}>Aucune donnée disponible</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoChart;