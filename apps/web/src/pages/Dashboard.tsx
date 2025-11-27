import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import type { Portfolio } from '../types';

export function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const data = await api.getPortfolio();
        setPortfolio(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div
          style={{
            backgroundColor: '#fee',
            color: '#c00',
            padding: '1rem',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ marginBottom: '1.5rem' }}>Portfolio</h1>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ color: '#666', marginBottom: '0.5rem' }}>
            Total Value
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {formatCurrency(portfolio?.totalValue ?? 0)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ color: '#666', marginBottom: '0.5rem' }}>Cash</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {formatCurrency(portfolio?.cashBalance ?? 0)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ color: '#666', marginBottom: '0.5rem' }}>Positions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {portfolio?.positions.length ?? 0}
          </div>
        </div>
      </div>

      {/* Quick Trade Button */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/trade"
          style={{
            display: 'inline-block',
            backgroundColor: '#2ecc71',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          Place Trade
        </Link>
      </div>

      {/* Positions Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <h2 style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
          Positions
        </h2>

        {portfolio?.positions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No positions yet.{' '}
            <Link to="/trade" style={{ color: '#3498db' }}>
              Place your first trade!
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  Symbol
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Quantity
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Avg Cost
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Current Price
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Market Value
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Gain/Loss
                </th>
              </tr>
            </thead>
            <tbody>
              {portfolio?.positions.map((position) => (
                <tr
                  key={position.symbol}
                  style={{ borderTop: '1px solid #eee' }}
                >
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {position.symbol}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {position.quantity.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {formatCurrency(position.avgCostBasis)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {formatCurrency(position.currentPrice)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {formatCurrency(position.marketValue)}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'right',
                      color: position.gainLoss >= 0 ? '#27ae60' : '#e74c3c',
                    }}
                  >
                    {formatCurrency(position.gainLoss)} (
                    {formatPercent(position.gainLossPercent)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
