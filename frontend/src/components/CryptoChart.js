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
  TimeScale
);

const CryptoChart = ({ cryptoId, currentPrice }) => {
  const [chartData, setChartData] = useState(null);
  const [timeframe, setTimeframe] = useState('7');
  const [loading, setLoading] = useState(true);
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
    try {
      const response = await fetch(`http://localhost:3001/api/history/${cryptoId}?days=${timeframe}`);
      const data = await response.json();
      
      if (data.prices) {
        const formattedData = {
          labels: data.prices.map(price => new Date(price[0])),
          datasets: [
            {
              label: `Prix (USD)`,
              data: data.prices.map(price => price[1]),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 5,
            },
          ],
        };
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données historiques:', error);
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
        position: 'top',
      },
      title: {
        display: true,
        text: `${cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1)} - Évolution du Prix`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Prix: $${context.parsed.y.toFixed(2)}`;
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
      },
      y: {
        beginAtZero: false,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);

          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">Chargement du graphique...</div>
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
          <div className="chart-error">Impossible de charger les données</div>
        )}
      </div>
    </div>
  );
};

export default CryptoChart;