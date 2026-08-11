# SyncTask AI - AI-Powered Task Management Portal

SyncTask AI is a full-stack, enterprise-grade task management dashboard designed with a modern dark theme and glassmorphic UI. It features user authentication (Spring Security + JWT), intelligent task assistance powered by the Google Gemini API, and a custom cryptographic audit ledger that logs all task updates in an immutable hash chain.

---

## Technical Stack

*   **Backend:** Spring Boot 3.3.2, Spring Security 6, Spring Data JPA, Java JWT (JJWT 0.12.x), Hibernate Validation.
*   **Frontend:** React 19, Vite, Tailwind CSS v3, Axios, Lucide React (Icons).
*   **Database:** MySQL 8.x (main profile) / H2 In-Memory Database (test profile).
*   **AI Integration:** Google Gemini API (`gemini-1.5-flash`).
*   **Security:** Hashed passwords (BCrypt), Stateless JWT Authentication, CORS configurations.

---

## Core Modules & Features

### 1. User Authentication
*   Fully secured REST API endpoints with Spring Security.
*   Register and Login pages with responsive validations.
*   Stateless authentication using JWT tokens automatically stored in `localStorage` and sent via Axios request interceptors.

### 2. Task Workspace (CRUD)
*   Portal-type Kanban dashboard separating tasks into **To Do**, **In Progress**, and **Done** status columns.
*   Interactive Task Creation & Edit Modal.
*   Full search filters and priority categorization (LOW, MEDIUM, HIGH).

### 3. AI Magic Suggestions (Task Description Generator)
*   Integrated **Option A — AI Task Description Generator** utilizing the Google Gemini API.
*   By writing a task title (e.g. *"Prepare client presentation"*) and clicking **AI Magic Fill**, the application sends a structured prompt to Gemini requesting valid JSON.
*   Automatically auto-fills the description, suggests the priority, and estimates the effort in hours.
*   **Robust Fallback:** If the `GEMINI_API_KEY` is not set or the API request fails, the application switches to a keyword-based mock engine that generates logical action items, priority, and hours based on the title keywords (e.g. *"bug"*, *"urgent"*, *"meeting"*, *"research"*).

### 4. Cryptographic Audit Ledger (Blockchain Integration)
*   Implemented **Option A — Immutable Task History** mock ledger.
*   Every task created, updated, or deleted creates a cryptographic "block" stored in the MySQL database.
*   Each block stores a `previous_hash` pointing to the previous block's SHA-256 hash, the action type, a JSON snapshot of the task state, a timestamp, and its own calculated SHA-256 hash.
*   **Verification Panel:** The dashboard contains a **Verify Ledger Integrity** section. Clicking it triggers an API call that traces the chain from the genesis block, recalculates all SHA-256 hashes, checks parent-child linkages, and reports whether the ledger is untampered (Green Shield) or compromised (Red Shield).

---

## Database Schema Diagram

Refer to [schema.sql](file:///d:/java_project/schema.sql) for SQL table structures.

```
                   +---------------------+
                   |        users        |
                   +---------------------+
                   | id (PK)             | <----+
                   | username (Unique)   |      |
                   | password            |      |
                   | role                |      |
                   +---------------------+      |
                              |                 |
                              | 1               |
                              |                 |
                              | N               |
                   +---------------------+      |
                   |        tasks        |      |
                   +---------------------+      |
                   | id (PK)             |      |
                   | title               |      |
                   | description         |      |
                   | priority            |      |
                   | status              |      |
                   | due_date            |      |
                   | estimated_hours     |      |
                   | created_timestamp   |      |
                   | user_id (FK) -------|------+
                   +---------------------+

                   +---------------------+
                   |    audit_blocks     |
                   +---------------------+
                   | id (PK)             |
                   | task_id             |
                   | action              |
                   | previous_hash (SHA) |
                   | hash (SHA)          |
                   | data (JSON Text)    |
                   | timestamp           |
                   +---------------------+
```

---

## Setup & Running Instructions

### Prerequisites
*   Java Development Kit (JDK) 17 or higher.
*   Node.js (v18 or higher) and npm.
*   MySQL Server (v8.x) running locally.

### Step 1: Create the MySQL Database
Log into your MySQL command-line client or administration interface (e.g., MySQL Workbench, phpMyAdmin) and run:

```sql
CREATE DATABASE taskportal;
```

*(Note: The Spring Boot configuration is set to automatically run `createDatabaseIfNotExist=true` on startup. If your root database user has appropriate permissions, this database will be created automatically.)*

### Step 2: Configure Environment Variables
Set the following environment variables if your MySQL configuration differs from defaults, or if you wish to enable the live Google Gemini API:

*   `MYSQL_USER`: The MySQL username (default: `root`).
*   `MYSQL_PASSWORD`: The MySQL password (default: empty).
*   `GEMINI_API_KEY`: Your Google Gemini API Key (Optional. If omitted, the app will run with a local mock AI generator).

### Step 3: Run the Backend
Navigate to the `backend` folder and run the Maven wrapper:

```bash
cd backend
# On Windows PowerShell:
.\mvnw.cmd spring-boot:run

# On Windows Command Prompt:
mvnw spring-boot:run

# On Linux/macOS:
./mvnw spring-boot:run
```

The Spring Boot server will start on **http://localhost:8080**.

### Step 4: Run the Frontend
Navigate to the `frontend` folder, install the packages, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

Open your browser and navigate to **http://localhost:5173**.

### Running the Test Suite
The backend contains a suite of mock and integration tests. To run them:

```bash
cd backend
.\mvnw.cmd clean test
```

*(Note: Tests will automatically use an in-memory H2 database via a test profile so they do not require MySQL to be running.)*

---

## REST API Endpoints

### Authentication
*   `POST /api/auth/register` - Registers a new user.
*   `POST /api/auth/login` - Authenticates user and returns JWT.

### Task Management (Protected - JWT Required)
*   `GET /api/tasks` - Fetches all tasks for the logged-in user.
*   `GET /api/tasks/{id}` - Fetches a specific task.
*   `POST /api/tasks` - Creates a new task.
*   `PUT /api/tasks/{id}` - Updates a task.
*   `DELETE /api/tasks/{id}` - Deletes a task.

### AI Suggestion (Protected - JWT Required)
*   `GET /api/ai/suggest?title={title}` - Returns AI-suggested task details.

### Cryptographic Audit (Protected - JWT Required)
*   `GET /api/audit` - Retrieves all blocks in the ledger.
*   `GET /api/audit/verify` - Recalculates hashes and verifies chain links.
