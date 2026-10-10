# Trading Engine Deployment Guide

This guide walks you through the steps to push your project to GitHub, deploy the frontend to Vercel, the backend to Render, connect it to NeonDB (PostgreSQL), and finally, how to test the deployed system.

## 1. Push to GitHub

First, you need to create a Git repository and push this code to GitHub.

1.  Open your terminal in the `Trading Engine` directory.
2.  Initialize the repository:
    ```bash
    git init
    ```
3.  Create a `.gitignore` file:
    ```bash
    echo "node_modules/\nbuild/\n__pycache__/\n*.so\n.env\ndocker-compose.override.yml" > .gitignore
    ```
4.  Commit your code:
    ```bash
    git add .
    git commit -m "Initial commit of Trading Engine"
    ```
5.  Go to [GitHub](https://github.com/) and create a new empty repository (e.g., `trading-engine`).
6.  Link and push:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/trading-engine.git
    git branch -M main
    git push -u origin main
    ```

## 2. Set Up PostgreSQL on NeonDB

Neon is a serverless Postgres platform.

1.  Sign up/Log in to [Neon](https://neon.tech/).
2.  Create a new project.
3.  Once the project is created, copy the **Connection String** (it should look like `postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require`).
4.  Keep this string handy; you will need it for the backend environment variables.

*(Note: We created the base engine in memory for the initial sprint. To fully integrate NeonDB, you would add SQLAlchemy to `backend/main.py` and write the history to the database. The `docker-compose.yml` already contains a local PostgreSQL setup which you can swap with the NeonDB URI).*

## 3. Deploy Backend to Render

Render is a unified cloud to build and run all your apps and websites.

1.  Sign up/Log in to [Render](https://render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account and select your `trading-engine` repository.
4.  **Configuration**:
    *   **Name**: `trading-engine-api`
    *   **Root Directory**: Leave blank (or use `/` if required).
    *   **Environment**: `Docker` (Render will automatically detect the `docker-compose.yml` or `backend/Dockerfile`. If it asks for the Dockerfile path, provide `backend/Dockerfile`).
5.  **Environment Variables**:
    *   Add `DATABASE_URL` and paste your NeonDB connection string.
6.  Click **Create Web Service**.
7.  Wait for the build to finish. Once done, Render will give you a public URL (e.g., `https://trading-engine-api.onrender.com`). Keep this URL handy.

## 4. Deploy Frontend to Vercel

Vercel is the best place to deploy frontend frameworks.

1.  Sign up/Log in to [Vercel](https://vercel.com/).
2.  Click **Add New...** -> **Project**.
3.  Import your `trading-engine` GitHub repository.
4.  **Configuration**:
    *   **Root Directory**: Edit this and select `frontend/`.
    *   **Framework Preset**: Vite
    *   **Environment Variables**:
        *   Add `VITE_API_URL` and set it to your Render backend URL (e.g., `https://trading-engine-api.onrender.com`).
        *   Add `VITE_WS_URL` and set it to your Render WebSocket URL (e.g., `wss://trading-engine-api.onrender.com/ws`).
5.  Click **Deploy**.
6.  Once finished, Vercel will give you a live URL for your frontend (e.g., `https://trading-engine-frontend.vercel.app`).

## 5. Test the Online Results

Now that your app is live, you can test it directly from the Vercel frontend link, but you can also run an automated load test against your deployed Render API.

1.  Open `test_script.py` in your local project.
2.  Change the `API_URL` at the top of the file to your new Render URL:
    ```python
    API_URL = "https://trading-engine-api.onrender.com"
    ```
3.  Run the test:
    ```bash
    python test_script.py
    ```
4.  The script will rapidly send orders (e.g., 1000 orders) to your live Render backend, and the C++ engine inside the Render container will process them. 
5.  Open your live Vercel Frontend in a browser. You should see the Order Book populating with Bids and Asks dynamically via WebSockets, confirming the whole system is working online!
