import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import type { Quote, OrderSide } from '../types';

export function Trade() {
  const [symbol, setSymbol] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<OrderSide>('buy');
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const lookupQuote = async () => {
    if (!symbol.trim()) return;

    setQuoteLoading(true);
    setError('');
    setQuote(null);

    try {
      const data = await api.getQuote(symbol.trim());
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!quote) {
      setError('Please look up a stock first');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setLoading(true);

    try {
      const order = await api.placeOrder({
        symbol: quote.symbol,
        side,
        quantity: qty,
      });

      setSuccess(
        `Order filled: ${side.toUpperCase()} ${qty} ${quote.symbol} @ $${order.filledPrice?.toFixed(2)}`,
      );

      // Reset form
      setQuantity('');
      setQuote(null);
      setSymbol('');

      // Navigate to dashboard after 2 seconds
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const estimatedCost = quote
    ? parseFloat(quantity || '0') * (side === 'buy' ? quote.ask : quote.bid)
    : 0;

  return (
    <Layout>
      <h1 style={{ marginBottom: '1.5rem' }}>Trade</h1>

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

      {success && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gap: '2rem', maxWidth: '600px' }}>
        {/* Symbol Lookup */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ marginBottom: '1rem' }}>Look Up Stock</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g. AAPL)"
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
              onKeyDown={(e) => e.key === 'Enter' && lookupQuote()}
            />
            <button
              onClick={lookupQuote}
              disabled={quoteLoading || !symbol.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: quoteLoading ? 'not-allowed' : 'pointer',
                opacity: quoteLoading || !symbol.trim() ? 0.7 : 1,
              }}
            >
              {quoteLoading ? 'Loading...' : 'Look Up'}
            </button>
          </div>
        </div>

        {/* Quote Display */}
        {quote && (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{quote.symbol}</h2>
                <div style={{ color: '#666' }}>{quote.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {formatCurrency(quote.last)}
                </div>
                <div
                  style={{
                    color: quote.change >= 0 ? '#27ae60' : '#e74c3c',
                  }}
                >
                  {quote.change >= 0 ? '+' : ''}
                  {quote.change.toFixed(2)} ({quote.change_percentage.toFixed(2)}
                  %)
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <div style={{ color: '#666' }}>Bid</div>
                <div>{formatCurrency(quote.bid)}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Ask</div>
                <div>{formatCurrency(quote.ask)}</div>
              </div>
              <div>
                <div style={{ color: '#666' }}>Volume</div>
                <div>{quote.volume.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Order Form */}
        {quote && (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ marginBottom: '1rem' }}>Place Order</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Side
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: side === 'buy' ? '#27ae60' : '#eee',
                      color: side === 'buy' ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      backgroundColor: side === 'sell' ? '#e74c3c' : '#eee',
                      color: side === 'sell' ? '#fff' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="0.0001"
                  step="any"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {parseFloat(quantity) > 0 && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {formatCurrency(estimatedCost)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !quantity}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: side === 'buy' ? '#27ae60' : '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || !quantity ? 0.7 : 1,
                }}
              >
                {loading
                  ? 'Placing Order...'
                  : `${side.toUpperCase()} ${quote.symbol}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
