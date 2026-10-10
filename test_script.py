import requests
import time
import random
import threading
import uuid

API_URL = "https://trading-engine-api-3i7j.onrender.com"
SYMBOL = "BTCUSD"

def test_add_order():
    is_buy = random.choice([True, False])
    price = round(random.uniform(50000, 60000), 2)
    quantity = random.randint(1, 10)
    
    payload = {
        "symbol": SYMBOL,
        "is_buy": is_buy,
        "price": price,
        "quantity": quantity
    }
    
    try:
        response = requests.post(f"{API_URL}/orders", json=payload)
        return response.status_code == 200
    except Exception as e:
        return False

def load_test(num_orders):
    print(f"Starting load test with {num_orders} orders...")
    start_time = time.time()
    
    success_count = 0
    for _ in range(num_orders):
        if test_add_order():
            success_count += 1
            
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"Load test complete.")
    print(f"Total time: {duration:.2f} seconds")
    print(f"Orders/sec: {num_orders / duration:.2f}")
    print(f"Success rate: {success_count}/{num_orders}")

if __name__ == "__main__":
    load_test(1000) # Testing with 1000 orders
