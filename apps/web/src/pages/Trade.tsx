import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useQuote, usePlaceOrder } from '../hooks';
import type { OrderSide } from '../types';

export function Trade() {
  const [symbol, setSymbol] = useState('');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState<OrderSide>('buy');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useQuote(searchSymbol, searchSymbol.length > 0);

  const placeOrderMutation = usePlaceOrder();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const lookupQuote = () => {
    if (!symbol.trim()) return;
    setSearchSymbol(symbol.trim().toUpperCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!quote) {
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return;
    }

    placeOrderMutation.mutate(
      {
        symbol: quote.symbol,
        side,
        quantity: qty,
      },
      {
        onSuccess: (order) => {
          setSuccess(
            `Order filled: ${side.toUpperCase()} ${qty} ${quote.symbol} @ $${order.filledPrice?.toFixed(2)}`,
          );

          // Reset form
          setQuantity('');
          setSearchSymbol('');
          setSymbol('');

          // Navigate to dashboard after 2 seconds
          timeoutRef.current = window.setTimeout(() => navigate('/'), 2000);
        },
      },
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const estimatedCost = quote
    ? parseFloat(quantity || '0') * (side === 'buy' ? quote.ask : quote.bid)
    : 0;

  const error =
    quoteError instanceof Error
      ? quoteError.message
      : placeOrderMutation.error instanceof Error
        ? placeOrderMutation.error.message
        : null;

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
                disabled={placeOrderMutation.isPending || !quantity}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: side === 'buy' ? '#27ae60' : '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: placeOrderMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: placeOrderMutation.isPending || !quantity ? 0.7 : 1,
                }}
              >
                {placeOrderMutation.isPending
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
