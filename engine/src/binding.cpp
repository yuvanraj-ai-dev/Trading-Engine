#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "OrderBook.h"

namespace py = pybind11;

PYBIND11_MODULE(matching_engine, m) {
    py::class_<Trade>(m, "Trade")
        .def_readonly("maker_order_id", &Trade::makerOrderId)
        .def_readonly("taker_order_id", &Trade::takerOrderId)
        .def_readonly("symbol", &Trade::symbol)
        .def_readonly("price", &Trade::price)
        .def_readonly("quantity", &Trade::quantity)
        .def_readonly("timestamp", &Trade::timestamp);

    py::class_<OrderBook>(m, "OrderBook")
        .def(py::init<>())
        .def("add_order", &OrderBook::addOrder, py::arg("id"), py::arg("symbol"), py::arg("is_buy"), py::arg("price"), py::arg("quantity"))
        .def("cancel_order", &OrderBook::cancelOrder, py::arg("id"))
        .def("get_snapshot", &OrderBook::getSnapshot, py::arg("symbol"));
}
