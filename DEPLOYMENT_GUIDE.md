# SyncTask AI - Deployment Guide

This guide provides step-by-step instructions for deploying the **SyncTask AI** application using **Render** for the Java Spring Boot backend (with PostgreSQL) and **Vercel** for the React frontend.

---

## Part 1: Deploying the Backend on Render

Render will host the Spring Boot application and provide a managed PostgreSQL database.

### 1. Create a PostgreSQL Database on Render
1. Log in to your Render Dashboard (https://dashboard.render.com).
2. Click **New +** and select **PostgreSQL**.
3. Name your database (e.g., `synctask-db`).
4. Select your preferred region and instance type (the free tier works fine).
5. Click **Create Database**.
6. Once created, copy the **Internal Database URL**. You will need this for the backend service.

### 2. Create the Web Service (Spring Boot Backend)
1. Go back to the Render Dashboard and click **New +**, then select **Web Service**.
2. Connect your GitHub repository containing the `synctask-portal` code.
3. Configure the service:
   - **Name:** `synctask-backend`
   - **Environment:** `Docker` (Render will automatically detect the Dockerfile in the `backend` folder).
   - **Root Directory:** `backend` (Ensure this is set so Render knows where to build from).
   - **Region:** Same as your database.
   - **Plan:** Free or Starter.

### 3. Configure Backend Environment Variables
Before clicking "Create Web Service", scroll down to the **Environment Variables** section and add the following keys:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | `[Your Internal Database URL]` | Paste the Internal DB URL copied from Step 1. |
| `SPRING_PROFILES_ACTIVE` | `prod` | Activates the PostgreSQL production settings. |
| `GEMINI_API_KEY` | `[Your Google Gemini API Key]` | (Optional) Enables the AI features. Get one from Google AI Studio. |
| `JWT_SECRET` | `[A long random string]` | (Optional) Used to sign JWTs. If omitted, a default is used. |
| `CORS_ALLOWED_ORIGIN` | `https://synctask-portal.vercel.app` | (Optional) Restricts API access to your Vercel frontend. (Currently, the app accepts all origins via `*` pattern for easier testing). |

4. Click **Create Web Service**.
5. Render will now build your Docker image and deploy the Spring Boot app.
6. Once it says **Live**, copy the public URL (e.g., `https://synctask-backend-xxxx.onrender.com`). You will need this for the frontend!

---

## Part 2: Deploying the Frontend on Vercel

Vercel will host the React/Vite frontend.

### 1. Create a New Project on Vercel
1. Log in to your Vercel Dashboard (https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `synctask-portal` GitHub repository.

### 2. Configure the Frontend Build Settings
1. In the "Configure Project" screen, ensure the **Framework Preset** is automatically set to `Vite`.
2. Expand the **Root Directory** section.
3. Click **Edit** and select the `frontend` folder. (This is crucial, otherwise Vercel will try to build the Java code!).

### 3. Configure Frontend Environment Variables
Expand the **Environment Variables** section and add the following key:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://synctask-backend-xxxx.onrender.com` | Paste the public URL of your Render backend. Do not include a trailing slash. |

### 4. Deploy
1. Click **Deploy**.
2. Vercel will run `npm install` and `npm run build`, and then publish your site.
3. Vercel automatically reads the `vercel.json` included in the `frontend` directory to route all React SPA paths (like `/register` or `/dashboard`) properly.
4. Once completed, click the preview window to visit your live site!

---

## Summary Checklist
- [ ] Render PostgreSQL DB created.
- [ ] Render Web Service built using the `backend` Root Directory.
- [ ] `DATABASE_URL` and `SPRING_PROFILES_ACTIVE=prod` set in Render.
- [ ] Vercel Project created using the `frontend` Root Directory.
- [ ] `VITE_API_URL` set in Vercel pointing to the Render backend.

Your SyncTask AI portal should now be fully live, connected to a production database, and accessible to anyone on the internet!
