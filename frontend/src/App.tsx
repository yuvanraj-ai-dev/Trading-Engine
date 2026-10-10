import React, { useState, useEffect, useRef } from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { createChart, ISeriesApi, Time } from 'lightweight-charts';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
const SYMBOL = "BTCUSD";

interface Order {
  id: number;
  symbol: string;
  is_buy: boolean;
  price: number;
  quantity: number;
  status: 'Open' | 'Filled' | 'Cancelled';
}

function App() {
  const [bids, setBids] = useState<[number, number][]>([]);
  const [asks, setAsks] = useState<[number, number][]>([]);
  
  const [price, setPrice] = useState<string>("50000");
  const [quantity, setQuantity] = useState<string>("1");
  const [isBuy, setIsBuy] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const lineSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const lastTime = useRef<number>(0);

  // Initialize Chart
  useEffect(() => {
    if (chartContainerRef.current && !chartInstance.current) {
      chartInstance.current = createChart(chartContainerRef.current, {
        layout: { 
          background: { type: 'solid', color: 'transparent' }, 
          textColor: '#848e9c' 
        },
        grid: { 
          vertLines: { color: '#2b3139' }, 
          horzLines: { color: '#2b3139' } 
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
        },
      });
      lineSeries.current = chartInstance.current.addLineSeries({ color: '#f3ba2f', lineWidth: 2 });
      
      const handleResize = () => {
        if (chartContainerRef.current && chartInstance.current) {
          chartInstance.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight 
          });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/orderbook/${SYMBOL}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const newBids = data.bids || [];
        const newAsks = data.asks || [];
        
        setBids(newBids);
        setAsks(newAsks);

        // Update Chart with Mid-Price
        if (newBids.length > 0 && newAsks.length > 0 && lineSeries.current) {
          const bestBid = newBids[0][0];
          const bestAsk = newAsks[0][0]; // Asks are sorted ascending from backend
          const midPrice = (bestBid + bestAsk) / 2;
          
          const now = Math.floor(Date.now() / 1000);
          // lightweight-charts needs unique timestamps, so only update if second has changed
          if (now > lastTime.current) {
            lineSeries.current.update({ time: now as Time, value: midPrice });
            lastTime.current = now;
          }
        }
      };

      ws.onclose = () => {
        console.log("WS closed. Reconnecting...");
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    
    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const placeOrder = async () => {
    if (!price || !quantity || Number(quantity) <= 0) return;
    setStatusMsg("Placing order...");
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: SYMBOL,
          is_buy: isBuy,
          price: Number(price),
          quantity: Number(quantity)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(`Success: Order #${data.order_id}`);
        
        setMyOrders(prev => {
          let updatedOrders = [...prev];
          
          if (data.trades && data.trades.length > 0) {
            data.trades.forEach((trade: any) => {
              updatedOrders = updatedOrders.map(o => {
                if (o.id === trade.maker_order_id) {
                  const newQty = o.quantity - trade.quantity;
                  return {
                    ...o,
                    quantity: newQty,
                    status: newQty <= 0 ? 'Filled' : 'Open'
                  };
                }
                return o;
              });
            });
          }
          
          let remainingQty = Number(quantity);
          if (data.trades) {
            data.trades.forEach((t: any) => {
              if (t.taker_order_id === data.order_id) remainingQty -= t.quantity;
            });
          }

          updatedOrders.unshift({
            id: data.order_id,
            symbol: SYMBOL,
            is_buy: isBuy,
            price: Number(price),
            quantity: remainingQty > 0 ? remainingQty : Number(quantity),
            status: remainingQty <= 0 ? 'Filled' : 'Open'
          });

          return updatedOrders;
        });
      } else {
        setStatusMsg("Failed to place order");
      }
    } catch (e) {
      setStatusMsg("Network error");
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: SYMBOL })
      });
      if (res.ok) {
        setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
      } else {
        alert("Order could not be cancelled (might be filled or already cancelled)");
      }
    } catch (e) {
      alert("Error cancelling order");
    }
  };

  const maxBidQty = Math.max(...bids.map(b => b[1]), 1);
  const maxAskQty = Math.max(...asks.map(a => a[1]), 1);
  const spread = asks.length > 0 && bids.length > 0 ? (asks[0][0] - bids[0][0]).toFixed(2) : "0.00";
  const currentPrice = asks.length > 0 ? asks[0][0] : 50000;

  return (
    <div className="app-container">
      <header className="header">
        <h1><Activity size={24} color="#f3ba2f" /> Trading Engine <span style={{ color: '#eaecef', fontSize: '1rem', marginLeft: '10px' }}>{SYMBOL}</span></h1>
      </header>

      <div className="trading-layout">
        <div className="panel orderbook-container">
          <div className="panel-header">Order Book</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="ob-table">
              <thead><tr><th>Price (USD)</th><th>Amount (BTC)</th></tr></thead>
              <tbody>
                {asks.slice().reverse().map((a, i) => (
                  <tr key={`ask-${i}`} className="ob-row" onClick={() => setPrice(a[0].toString())}>
                    <td className="text-sell">{a[0].toFixed(2)}</td>
                    <td>{a[1]}</td>
                    <div className="ob-bg bg-sell" style={{ width: `${(a[1] / maxAskQty) * 100}%` }}></div>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="ob-spread text-buy">
              {currentPrice.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Spread: {spread}</span>
            </div>

            <table className="ob-table">
              <tbody>
                {bids.map((b, i) => (
                  <tr key={`bid-${i}`} className="ob-row" onClick={() => setPrice(b[0].toString())}>
                    <td className="text-buy">{b[0].toFixed(2)}</td>
                    <td>{b[1]}</td>
                    <div className="ob-bg bg-buy" style={{ width: `${(b[1] / maxBidQty) * 100}%` }}></div>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="center-content">
          <div className="panel chart-container" style={{ position: 'relative' }}>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
          </div>
          
          <div className="panel open-orders-container">
            <div className="panel-header">Open Orders</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pair</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No open orders</td></tr>
                  ) : myOrders.map((o, i) => (
                    <tr key={i}>
                      <td>{new Date().toLocaleTimeString()}</td>
                      <td>{o.symbol}</td>
                      <td>Limit</td>
                      <td className={o.is_buy ? "text-buy" : "text-sell"}>{o.is_buy ? "Buy" : "Sell"}</td>
                      <td>{o.price.toFixed(2)}</td>
                      <td>{o.quantity}</td>
                      <td>{o.status}</td>
                      <td>
                        {o.status === 'Open' && (
                          <button className="cancel-btn" onClick={() => cancelOrder(o.id)}>
                            <Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel order-entry-container">
          <div className="order-tabs">
            <div className={`order-tab buy ${isBuy ? 'active' : ''}`} onClick={() => setIsBuy(true)}>Buy</div>
            <div className={`order-tab sell ${!isBuy ? 'active' : ''}`} onClick={() => setIsBuy(false)}>Sell</div>
          </div>
          
          <div className="order-form">
            <div className="input-group">
              <span className="input-label">Price</span>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
              <span className="input-suffix">USD</span>
            </div>
            
            <div className="input-group">
              <span className="input-label">Amount</span>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
              <span className="input-suffix">BTC</span>
            </div>

            <div className="input-group" style={{ backgroundColor: 'transparent' }}>
              <span className="input-label">Total</span>
              <input type="text" readOnly value={(Number(price) * Number(quantity)).toFixed(2)} />
              <span className="input-suffix">USD</span>
            </div>

            <button className={`submit-btn ${isBuy ? 'buy' : 'sell'}`} onClick={placeOrder}>
              {isBuy ? 'Buy' : 'Sell'} {SYMBOL.replace('USD', '')}
            </button>
            <div className="status-msg" style={{ color: statusMsg.includes('Success') ? 'var(--buy-color)' : 'var(--text-muted)' }}>
              {statusMsg}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
