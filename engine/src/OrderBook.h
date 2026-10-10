#pragma once
#include <iostream>
#include <string>
#include <map>
#include <list>
#include <unordered_map>
#include <vector>
#include <chrono>

struct Order {
    int id;
    std::string symbol;
    bool isBuy;
    double price;
    int quantity;
    long timestamp;
};

struct Trade {
    int makerOrderId;
    int takerOrderId;
    std::string symbol;
    double price;
    int quantity;
    long timestamp;
};

class OrderBook {
public:
    OrderBook() = default;
    
    // Core functions
    std::vector<Trade> addOrder(int id, const std::string& symbol, bool isBuy, double price, int quantity);
    bool cancelOrder(int id);
    
    // Snapshots
    std::map<std::string, std::vector<std::pair<double, int>>> getSnapshot(const std::string& symbol);
    
private:
    std::map<double, std::list<Order>, std::greater<double>> bids;
    std::map<double, std::list<Order>> asks;
    std::unordered_map<int, std::list<Order>::iterator> orderLookup;
    
    long getCurrentTimestamp();
};
