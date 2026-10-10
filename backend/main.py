from fastapi import FastAPI, WebSocket, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import uuid
import os

# We will import the compiled C++ matching engine here
try:
    import matching_engine
except ImportError:
    print("Warning: matching_engine module not found. Please compile the C++ engine.")
    matching_engine = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for books since we don't have persistence yet
books = {}
def get_book(symbol: str):
    if symbol not in books:
        if matching_engine:
            books[symbol] = matching_engine.OrderBook()
        else:
            books[symbol] = None
    return books[symbol]

class OrderModel(BaseModel):
    symbol: str
    is_buy: bool
    price: float
    quantity: int

class CancelOrderModel(BaseModel):
    symbol: str

@app.post("/orders")
async def place_order(order: OrderModel):
    book = get_book(order.symbol)
    if not book:
        raise HTTPException(status_code=500, detail="Matching engine not available")
    
    order_id = uuid.uuid4().int & (1<<31)-1 # Simple ID generation
    trades = book.add_order(order_id, order.symbol, order.is_buy, order.price, order.quantity)
    
    trades_data = []
    for t in trades:
        trades_data.append({
            "maker_order_id": t.maker_order_id,
            "taker_order_id": t.taker_order_id,
            "symbol": t.symbol,
            "price": t.price,
            "quantity": t.quantity,
            "timestamp": t.timestamp
        })
    
    return {"status": "success", "order_id": order_id, "trades": trades_data}

@app.delete("/orders/{order_id}")
async def cancel_order(order_id: int, details: CancelOrderModel):
    book = get_book(details.symbol)
    if not book:
        raise HTTPException(status_code=500, detail="Matching engine not available")
    
    success = book.cancel_order(order_id)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"status": "success"}

@app.get("/orderbook/{symbol}")
async def get_orderbook(symbol: str):
    book = get_book(symbol)
    if not book:
        raise HTTPException(status_code=500, detail="Matching engine not available")
    
    snapshot = book.get_snapshot(symbol)
    return snapshot

ADMIN_KEY = os.environ.get("ADMIN_KEY", "admin-secret-key")

@app.post("/admin/clear/{symbol}")
async def admin_clear_book(symbol: str, x_admin_key: str = Header(None)):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: invalid admin key")
    book = get_book(symbol)
    if not book:
        raise HTTPException(status_code=500, detail="Matching engine not available")
    book.clear_book()
    return {"status": "success", "message": f"Order book for {symbol} cleared"}

@app.websocket("/ws/orderbook/{symbol}")
async def websocket_orderbook(websocket: WebSocket, symbol: str):
    await websocket.accept()
    book = get_book(symbol)
    try:
        while True:
            if book:
                snapshot = book.get_snapshot(symbol)
                await websocket.send_json(snapshot)
            await asyncio.sleep(1) # Send updates every second
    except:
        pass
