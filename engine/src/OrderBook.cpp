#include "OrderBook.h"
#include <algorithm>

long OrderBook::getCurrentTimestamp() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}

std::vector<Trade> OrderBook::addOrder(int id, const std::string& symbol, bool isBuy, double price, int quantity) {
    Order newOrder{id, symbol, isBuy, price, quantity, getCurrentTimestamp()};
    std::vector<Trade> trades;

    if (isBuy) {
        auto it = asks.begin();
        while (it != asks.end() && it->first <= price && newOrder.quantity > 0) {
            auto& orderList = it->second;
            auto listIt = orderList.begin();
            while (listIt != orderList.end() && newOrder.quantity > 0) {
                int matchedQty = std::min(newOrder.quantity, listIt->quantity);
                trades.push_back(Trade{listIt->id, newOrder.id, symbol, listIt->price, matchedQty, getCurrentTimestamp()});
                
                newOrder.quantity -= matchedQty;
                listIt->quantity -= matchedQty;
                
                if (listIt->quantity == 0) {
                    orderLookup.erase(listIt->id);
                    listIt = orderList.erase(listIt);
                } else {
                    ++listIt;
                }
            }
            if (orderList.empty()) {
                it = asks.erase(it);
            } else {
                ++it;
            }
        }
        if (newOrder.quantity > 0) {
            bids[price].push_back(newOrder);
            orderLookup[id] = std::prev(bids[price].end());
        }
    } else {
        auto it = bids.begin();
        while (it != bids.end() && it->first >= price && newOrder.quantity > 0) {
            auto& orderList = it->second;
            auto listIt = orderList.begin();
            while (listIt != orderList.end() && newOrder.quantity > 0) {
                int matchedQty = std::min(newOrder.quantity, listIt->quantity);
                trades.push_back(Trade{listIt->id, newOrder.id, symbol, listIt->price, matchedQty, getCurrentTimestamp()});
                
                newOrder.quantity -= matchedQty;
                listIt->quantity -= matchedQty;
                
                if (listIt->quantity == 0) {
                    orderLookup.erase(listIt->id);
                    listIt = orderList.erase(listIt);
                } else {
                    ++listIt;
                }
            }
            if (orderList.empty()) {
                it = bids.erase(it);
            } else {
                ++it;
            }
        }
        if (newOrder.quantity > 0) {
            asks[price].push_back(newOrder);
            orderLookup[id] = std::prev(asks[price].end());
        }
    }
    
    return trades;
}

bool OrderBook::cancelOrder(int id) {
    auto it = orderLookup.find(id);
    if (it == orderLookup.end()) {
        return false;
    }
    
    Order order = *(it->second);
    if (order.isBuy) {
        bids[order.price].erase(it->second);
        if (bids[order.price].empty()) {
            bids.erase(order.price);
        }
    } else {
        asks[order.price].erase(it->second);
        if (asks[order.price].empty()) {
            asks.erase(order.price);
        }
    }
    orderLookup.erase(it);
    return true;
}

std::map<std::string, std::vector<std::pair<double, int>>> OrderBook::getSnapshot(const std::string& symbol) {
    std::map<std::string, std::vector<std::pair<double, int>>> snapshot;
    
    std::vector<std::pair<double, int>> bidLevels;
    for (const auto& [price, orderList] : bids) {
        int totalQty = 0;
        for (const auto& order : orderList) {
            totalQty += order.quantity;
        }
        bidLevels.push_back({price, totalQty});
    }
    snapshot["bids"] = bidLevels;
    
    std::vector<std::pair<double, int>> askLevels;
    for (const auto& [price, orderList] : asks) {
        int totalQty = 0;
        for (const auto& order : orderList) {
            totalQty += order.quantity;
        }
        askLevels.push_back({price, totalQty});
    }
    snapshot["asks"] = askLevels;
    
    return snapshot;
}

void OrderBook::clearBook() {
    bids.clear();
    asks.clear();
    orderLookup.clear();
}
