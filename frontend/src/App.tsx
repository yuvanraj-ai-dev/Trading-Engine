import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
const SYMBOL = "BTCUSD";

function App() {
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  
  const [price, setPrice] = useState(50000);
  const [quantity, setQuantity] = useState(1);
  const [isBuy, setIsBuy] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/orderbook/${SYMBOL}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setBids(data.bids || []);
      setAsks(data.asks || []);
    };
    return () => ws.close();
  }, []);

  const placeOrder = async () => {
    setStatus("Placing order...");
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
      setStatus(`Success! Order ID: ${data.order_id}`);
    } catch (e) {
      setStatus("Error placing order");
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Trading Engine ({SYMBOL})</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Place Order</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Type: </label>
            <select value={isBuy ? "buy" : "sell"} onChange={e => setIsBuy(e.target.value === "buy")}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Price: </label>
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Quantity: </label>
            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </div>
          <button onClick={placeOrder} style={{ width: '100%', padding: '10px', background: isBuy ? 'green' : 'red', color: 'white', border: 'none', borderRadius: '4px' }}>
            Submit {isBuy ? "Buy" : "Sell"}
          </button>
          <p>{status}</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'green' }}>Bids</h3>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead><tr><th>Price</th><th>Qty</th></tr></thead>
            <tbody>
              {bids.map((b, i) => (
                <tr key={i}><td>{b[0]}</td><td>{b[1]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'red' }}>Asks</h3>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <thead><tr><th>Price</th><th>Qty</th></tr></thead>
            <tbody>
              {asks.slice().reverse().map((a, i) => (
                <tr key={i}><td>{a[0]}</td><td>{a[1]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
