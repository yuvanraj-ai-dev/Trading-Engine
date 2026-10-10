cmake_minimum_required(VERSION 3.10)
project(matching_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Pybind11 integration
# Ensure pybind11 is installed in the python environment being used
# pip install pybind11
find_package(pybind11 REQUIRED)

pybind11_add_module(matching_engine src/binding.cpp src/OrderBook.cpp)

# We can also add tests here later
