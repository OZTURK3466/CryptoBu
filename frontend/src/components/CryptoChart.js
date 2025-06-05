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
import { formatPrice, getSymbolForCurrency, getCurrencyName, getPriceValue } from '../utils/currencyUtils';
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

const CryptoChart = ({ cryptoId, currentPrice, currency = 'usd' }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  // Fonction pour récupérer les données historiques
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
        // NE PAS convertir ici - utiliser directement les prix USD de l'API
        // La conversion sera faite dans l'affichage
        const formattedData = {
          labels: data.prices.map(price => new Date(price[0])),
          datasets: [
            {
              label: `Prix (${currency.toUpperCase()})`,
              data: data.prices.map(price => {
                const usdPrice = price[1];
                // Convertir selon la devise sélectionnée
                if (currency === 'eur') {
                  return usdPrice * 0.92; // Conversion USD -> EUR
                }
                return usdPrice; // USD par défaut
              }),
              borderColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
              backgroundColor: currency === 'usd' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
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

  // Recharger les données quand la crypto, la période ou la devise change
  useEffect(() => {
    fetchHistoricalData();
  }, [cryptoId, timeframe, currency]); // Ajout de 'currency' dans les dépendances

  // Mettre à jour le prix en temps réel
  useEffect(() => {
    if (chartData && currentPrice && chartRef.current) {
      const chart = chartRef.current;
      const now = new Date();
      
      // Convertir le prix actuel selon la devise
      let displayPrice = currentPrice;
      if (currency === 'eur' && typeof currentPrice === 'number') {
        displayPrice = currentPrice * 0.92;
      }
      
      // Ajouter le nouveau point de prix
      chart.data.labels.push(now);
      chart.data.datasets[0].data.push(displayPrice);
      
      // Garder seulement les 100 derniers points pour éviter la surcharge
      if (chart.data.labels.length > 100) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      
      chart.update('none'); // Update sans animation pour plus de fluidité
    }
  }, [currentPrice, chartData, currency]); // Ajout de 'currency' dans les dépendances

  const currencySymbol = getSymbolForCurrency(currency);
  const currencyName = getCurrencyName(currency);

  // Fonction pour formater les dates de manière sécurisée
  const formatDate = (date) => {
    try {
      if (!date) return 'Date invalide';
      
      // Si c'est déjà un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' à ' + date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Si c'est un timestamp
      const timestamp = typeof date === 'string' ? parseInt(date) : date;
      if (!isNaN(timestamp)) {
        const dateObj = new Date(timestamp);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) + ' à ' + dateObj.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      return 'Date non disponible';
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return 'Date non disponible';
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
        text: `${cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1)} - Évolution du Prix (${currency.toUpperCase()})`,
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
        bodyColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
        borderColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        callbacks: {
          title: function(context) {
            try {
              if (context && context.length > 0) {
                const dataIndex = context[0].dataIndex;
                const chart = context[0].chart;
                
                if (chart && chart.data && chart.data.labels && chart.data.labels[dataIndex]) {
                  const date = chart.data.labels[dataIndex];
                  return formatDate(date);
                }
              }
              return 'Date non disponible';
            } catch (error) {
              console.error('Erreur tooltip title:', error);
              return 'Date non disponible';
            }
          },
          label: function(context) {
            try {
              const price = context.parsed.y;
              if (price !== null && price !== undefined && !isNaN(price)) {
                return `Prix: ${formatPrice(price, currency)}`;
              }
              return 'Prix non disponible';
            } catch (error) {
              console.error('Erreur tooltip label:', error);
              return 'Prix non disponible';
            }
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
            try {
              if (value !== null && value !== undefined && !isNaN(value)) {
                return formatPrice(value, currency);
              }
              return '';
            } catch (error) {
              console.error('Erreur formatage prix axe Y:', error);
              return '';
            }
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
              border: `4px solid ${currency === 'usd' ? 'rgba(0, 212, 170, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
              borderTop: `4px solid ${currency === 'usd' ? '#00D4AA' : '#3B82F6'}`,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ 
              margin: 0, 
              color: currency === 'usd' ? '#00D4AA' : '#3B82F6',
              fontSize: '1.25rem'
            }}>
              📈 Graphique ({currencyName})
            </h3>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                  style={{
                    backgroundColor: timeframe === value 
                      ? (currency === 'usd' ? '#00D4AA' : '#3B82F6')
                      : 'transparent',
                    borderColor: timeframe === value 
                      ? (currency === 'usd' ? '#00D4AA' : '#3B82F6')
                      : 'rgba(55, 65, 81, 0.5)',
                    color: timeframe === value 
                      ? '#0B0B0F' 
                      : '#9CA3AF'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {currentPrice && (
              <div className="current-price" style={{
                borderColor: currency === 'usd' ? 'rgba(0, 212, 170, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                background: currency === 'usd' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(59, 130, 246, 0.1)'
              }}>
                <span className="price-label">Prix actuel:</span>
                <span className="price-value" style={{
                  color: currency === 'usd' ? '#00D4AA' : '#3B82F6'
                }}>
                  {formatPrice(getPriceValue({ usd: currentPrice, eur: currentPrice * 0.92 }, currency), currency)}
                </span>
              </div>
            )}
          </div>
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
                  background: `linear-gradient(135deg, ${currency === 'usd' ? '#00D4AA, #00E4BB' : '#3B82F6, #60A5FA'})`,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                style={{
                  backgroundColor: timeframe === value 
                    ? (currency === 'usd' ? '#00D4AA' : '#3B82F6')
                    : 'transparent',
                  borderColor: timeframe === value 
                    ? (currency === 'usd' ? '#00D4AA' : '#3B82F6')
                    : 'rgba(55, 65, 81, 0.5)',
                  color: timeframe === value 
                    ? '#0B0B0F' 
                    : '#9CA3AF'
                }}
              >
                {label}
              </button>
            ))}
          </div>
          
          {currentPrice && (
            <div className="current-price" style={{
              borderColor: currency === 'usd' ? 'rgba(0, 212, 170, 0.3)' : 'rgba(59, 130, 246, 0.3)',
              background: currency === 'usd' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(59, 130, 246, 0.1)'
            }}>
              <span className="price-label">Prix actuel ({currency.toUpperCase()}):</span>
              <span className="price-value" style={{
                color: currency === 'usd' ? '#00D4AA' : '#3B82F6'
              }}>
                {formatPrice(getPriceValue({ usd: currentPrice, eur: currentPrice * 0.92 }, currency), currency)}
              </span>
              
              {/* Affichage dans l'autre devise */}
              <div style={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                marginTop: '0.25rem'
              }}>
                ≈ {currency === 'usd' 
                  ? formatPrice(currentPrice * 0.92, 'eur')
                  : formatPrice(currentPrice / 0.92, 'usd')
                }
              </div>
            </div>
          )}
        </div>
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
      
      {/* Légende personnalisée */}
      <div style={{
        padding: '1rem 2rem',
        borderTop: '1px solid rgba(55, 65, 81, 0.3)',
        background: 'rgba(15, 15, 26, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.875rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '12px',
            height: '3px',
            background: currency === 'usd' ? '#00D4AA' : '#3B82F6',
            borderRadius: '2px'
          }} />
          <span style={{ color: '#9CA3AF' }}>
            Prix en {currencyName} ({currencySymbol})
          </span>
        </div>
        
        <div style={{ color: '#9CA3AF' }}>
          Période: {timeframe} jour{timeframe > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default CryptoChart;