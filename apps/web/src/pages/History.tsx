import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import type { Order } from '../types';

export function History() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await api.getOrders();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ marginBottom: '1.5rem' }}>Order History</h1>

      {error && (
        <div
          style={{
            backgroundColor: '#fee',
            color: '#c00',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {orders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
            No orders yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  Date
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  Symbol
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>
                  Side
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Quantity
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Price
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Total
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td
                    style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}
                  >
                    {order.symbol}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          order.side === 'buy' ? '#e8f5e9' : '#ffebee',
                        color: order.side === 'buy' ? '#2e7d32' : '#c62828',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                      }}
                    >
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {order.quantity.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {order.filledPrice
                      ? formatCurrency(order.filledPrice)
                      : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {order.filledPrice
                      ? formatCurrency(order.quantity * order.filledPrice)
                      : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor:
                          order.status === 'filled' ? '#e8f5e9' : '#fff3e0',
                        color:
                          order.status === 'filled' ? '#2e7d32' : '#e65100',
                        fontSize: '0.8rem',
                      }}
                    >
                      {order.status.toUpperCase()}
                    </span>
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
