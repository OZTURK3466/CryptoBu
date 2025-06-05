import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
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
  Filler,
  zoomPlugin
);

const CryptoChart = ({ cryptoId, currentPrice, currency = 'usd' }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allData, setAllData] = useState({}); // Cache pour toutes les données
  const [currentRange, setCurrentRange] = useState({ start: null, end: null });
  const [priceRange, setPriceRange] = useState({ min: null, max: null });
  const [isZoomed, setIsZoomed] = useState(false);
  const [crosshair, setCrosshair] = useState({ x: null, y: null, visible: false });
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  // Fonction pour récupérer les données historiques avec cache intelligent
  const fetchHistoricalData = useCallback(async (days) => {
    // Vérifier si on a déjà les données en cache
    if (allData[days] && allData[days].length > 0) {
      console.log(`📊 Utilisation du cache pour ${cryptoId} (${days} jours)`);
      return allData[days];
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/history/${cryptoId}?days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.prices && data.prices.length > 0) {
        const formattedData = data.prices.map(price => {
          const usdPrice = price[1];
          const convertedPrice = currency === 'eur' ? usdPrice * 0.92 : usdPrice;
          return {
            x: new Date(price[0]),
            y: convertedPrice,
            volume: data.volumes ? data.volumes.find(v => v[0] === price[0])?.[1] || 0 : 0
          };
        });
        
        // Mettre en cache
        setAllData(prev => ({ ...prev, [days]: formattedData }));
        return formattedData;
      } else {
        throw new Error('Aucune donnée de prix disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données historiques:', error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cryptoId, currency, allData]);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchHistoricalData(parseInt(timeframe));
      if (data) {
        updateChartData(data);
      }
    };
    loadData();
  }, [cryptoId, timeframe, currency, fetchHistoricalData]);

  // Fonction pour mettre à jour les données du graphique
  const updateChartData = useCallback((data) => {
    if (!data || data.length === 0) return;

    const formattedData = {
      datasets: [
        {
          label: `Prix (${currency.toUpperCase()})`,
          data: data,
          borderColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
          backgroundColor: currency === 'usd' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        },
      ],
    };

    setChartData(formattedData);

    // Calculer la plage de prix
    const prices = data.map(d => d.y);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    setPriceRange({
      min: Math.max(0, minPrice - padding),
      max: maxPrice + padding
    });

    // Définir la plage temporelle actuelle
    setCurrentRange({
      start: data[0].x,
      end: data[data.length - 1].x
    });

    setIsZoomed(false);
  }, [currency]);

  // Gestionnaires de zoom et navigation
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.zoom(1.2);
      setIsZoomed(true);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.zoom(0.8);
      setIsZoomed(true);
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  }, []);

  const handlePanLeft = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.pan({ x: -50 });
      setIsZoomed(true);
    }
  }, []);

  const handlePanRight = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.pan({ x: 50 });
      setIsZoomed(true);
    }
  }, []);

  // Charger plus de données automatiquement
  const loadMoreData = useCallback(async (direction = 'past') => {
    if (direction === 'past') {
      // Charger des données plus anciennes
      const longerPeriod = Math.min(parseInt(timeframe) * 2, 365);
      const moreData = await fetchHistoricalData(longerPeriod);
      if (moreData) {
        updateChartData(moreData);
      }
    }
  }, [timeframe, fetchHistoricalData, updateChartData]);

  // Gestion du curseur croisé
  const handleMouseMove = useCallback((event) => {
    if (!chartRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCrosshair({ x, y, visible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshair({ x: null, y: null, visible: false });
  }, []);

  // Options du graphique avec fonctionnalités interactives
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
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
        borderColor: currency === 'usd' ? '#00D4AA' : '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          title: function(context) {
            if (context && context.length > 0) {
              const date = context[0].parsed.x;
              return new Date(date).toLocaleString('fr-FR');
            }
            return '';
          },
          label: function(context) {
            const price = context.parsed.y;
            return `Prix: ${formatPrice(price, currency)}`;
          },
        },
      },
      zoom: {
        limits: {
          x: { min: 'original', max: 'original' },
          y: { min: priceRange.min * 0.9, max: priceRange.max * 1.1 }
        },
        pan: {
          enabled: true,
          mode: 'xy',
          threshold: 10,
          onPanComplete: ({ chart }) => {
            setIsZoomed(true);
            // Détecter si on approche des bords pour charger plus de données
            const xAxis = chart.scales.x;
            const dataLength = chartData?.datasets[0]?.data?.length || 0;
            
            if (xAxis.min <= 0.1 * dataLength) {
              loadMoreData('past');
            }
          }
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
          onZoomComplete: ({ chart }) => {
            setIsZoomed(true);
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd/MM',
            week: 'dd/MM',
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9CA3AF',
          maxTicksLimit: 8,
          font: { size: 11 }
        },
      },
      y: {
        position: 'right',
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          callback: function(value) {
            return formatPrice(value, currency);
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4,
      },
      line: {
        tension: 0.1,
      },
    },
    onHover: (event, elements) => {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = elements.length > 0 ? 'crosshair' : 'default';
      }
    }
  };

  const currencySymbol = getSymbolForCurrency(currency);
  const currencyName = getCurrencyName(currency);

  if (loading && !chartData) {
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
            <span>Chargement du graphique interactif...</span>
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
              📈 Graphique Interactif ({currencyName})
            </h3>
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
                onClick={() => fetchHistoricalData(parseInt(timeframe))}
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
      {/* Contrôles du graphique */}
      <div className="chart-controls">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Titre */}
          <h3 style={{ 
            margin: 0, 
            color: currency === 'usd' ? '#00D4AA' : '#3B82F6',
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📈 Graphique Interactif
            {isZoomed && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: 'rgba(255, 165, 0, 0.2)',
                color: '#FFA500',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 'normal'
              }}>
                ZOOM
              </span>
            )}
          </h3>

          {/* Prix actuel */}
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
            </div>
          )}
        </div>

        {/* Contrôles de navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          {/* Intervalles de temps */}
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

          {/* Contrôles de navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Boutons de panoramique */}
            <div style={{ 
              display: 'flex', 
              gap: '0.25rem',
              background: 'rgba(26, 26, 46, 0.5)',
              borderRadius: '8px',
              padding: '0.25rem'
            }}>
              <button
                onClick={handlePanLeft}
                title="Panoramique gauche"
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#9CA3AF',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9CA3AF';
                }}
              >
                ←
              </button>
              <button
                onClick={handlePanRight}
                title="Panoramique droite"
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#9CA3AF',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9CA3AF';
                }}
              >
                →
              </button>
            </div>

            {/* Boutons de zoom */}
            <div style={{ 
              display: 'flex', 
              gap: '0.25rem',
              background: 'rgba(26, 26, 46, 0.5)',
              borderRadius: '8px',
              padding: '0.25rem'
            }}>
              <button
                onClick={handleZoomIn}
                title="Zoom avant"
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#9CA3AF',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9CA3AF';
                }}
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom arrière"
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: '#9CA3AF',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(55, 65, 81, 0.5)';
                  e.target.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9CA3AF';
                }}
              >
                −
              </button>
            </div>

            {/* Bouton de reset */}
            <button
              onClick={handleResetZoom}
              title="Réinitialiser la vue"
              disabled={!isZoomed}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                background: isZoomed ? `${currency === 'usd' ? '#00D4AA' : '#3B82F6'}` : 'transparent',
                color: isZoomed ? '#0B0B0F' : '#9CA3AF',
                borderRadius: '6px',
                cursor: isZoomed ? 'pointer' : 'not-allowed',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                opacity: isZoomed ? 1 : 0.5
              }}
            >
              🎯 Reset
            </button>

            {/* Bouton pour charger plus de données */}
            <button
              onClick={() => loadMoreData('past')}
              title="Charger plus de données historiques"
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid rgba(124, 58, 237, 0.5)',
                background: 'rgba(124, 58, 237, 0.1)',
                color: '#A855F7',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#A855F7';
                e.target.style.background = 'rgba(124, 58, 237, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                e.target.style.background = 'rgba(124, 58, 237, 0.1)';
              }}
            >
              📊 Plus
            </button>
          </div>
        </div>
      </div>
      
      {/* Zone du graphique */}
      <div 
        className="chart-wrapper" 
        style={{ position: 'relative', height: '500px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {chartData ? (
          <Line 
            ref={chartRef} 
            data={chartData} 
            options={options}
            style={{ cursor: 'crosshair' }}
          />
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

        {/* Indicateur de crosshair personnalisé */}
        {crosshair.visible && (
          <>
            <div style={{
              position: 'absolute',
              left: crosshair.x,
              top: 0,
              bottom: 0,
              width: '1px',
              background: currency === 'usd' ? '#00D4AA' : '#3B82F6',
              opacity: 0.6,
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              top: crosshair.y,
              left: 0,
              right: 0,
              height: '1px',
              background: currency === 'usd' ? '#00D4AA' : '#3B82F6',
              opacity: 0.6,
              pointerEvents: 'none'
            }} />
          </>
        )}
      </div>
      
      {/* Instructions d'utilisation */}
      <div style={{
        padding: '1rem 2rem',
        borderTop: '1px solid rgba(55, 65, 81, 0.3)',
        background: 'rgba(15, 15, 26, 0.3)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#9CA3AF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: currency === 'usd' ? '#00D4AA' : '#3B82F6' }}>🖱️</span>
          <span>Roulette de souris pour zoomer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: currency === 'usd' ? '#00D4AA' : '#3B82F6' }}>👆</span>
          <span>Cliquer-glisser pour naviguer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: currency === 'usd' ? '#00D4AA' : '#3B82F6' }}>⌨️</span>
          <span>Boutons ← → pour panoramique</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: currency === 'usd' ? '#00D4AA' : '#3B82F6' }}>🎯</span>
          <span>Reset pour vue d'ensemble</span>
        </div>
      </div>
    </div>
  );
};

export default CryptoChart;