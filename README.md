# 🚀 English Learning System

An advanced **AI-powered English learning platform** built with a **microservices architecture**, supporting shadowing practice, pronunciation analysis, and intelligent language processing.

---

## 🧠 Overview

This system enables users to learn English effectively through:

* 🎧 Audio & YouTube Shadowing
* 🗣️ Speech Recording & Pronunciation Scoring
* 📖 Sentence-based Transcript Learning
* 🤖 AI-powered Language Processing (STT, TTS, Translation)
* ⚡ Scalable Microservices Architecture

---

## 🏗️ Architecture

The system follows a **microservices architecture** using Spring Cloud ecosystem.

```
Frontend (Vite + React)
        │
        ▼
API Gateway (Spring Cloud Gateway)
        │
        ▼
Service Discovery (Eureka)
        │
 ┌───────────────┬───────────────┬───────────────┐
 │               │               │               │
User Service   Content Service  Dictionary     Notification
               (Lesson Data)     Service         Service
        │
        ▼
Language Processing Service (FastAPI + AI)
```

---

## 🧩 Tech Stack

### 🔧 Backend

* Java + Spring Boot
* Spring Cloud Gateway
* Eureka Service Discovery

### 🤖 AI Service

* FastAPI (Python)
* WhisperX (Speech-to-Text)
* Gemini API (AI processing)

### 🌐 Frontend

* React (Vite)
* TailwindCSS / UI components

### 🗄️ Database

* **User Service**: PostgreSQL + Redis
* **Content Service**: PostgreSQL
* **Dictionary Service**: MongoDB + Redis

### ⚡ Messaging

* Kafka (event-driven communication)

### 🔐 Authentication

* Keycloak (OAuth2 / Identity Management)

### ☁️ Storage

* Cloudinary (media storage)

### 🐳 Deployment

* Docker Compose (multi-service setup)

---

## 📦 Core Services

### 👤 User Service

* User authentication & authorization
* Learning progress tracking
* Session & token management (Redis)

---

### 📚 Content Service

* Lessons & sentence management
* Transcript segmentation
* Shadowing data (start/end timestamps)

---

### 📖 Dictionary Service

* Word definitions & translations
* Caching with Redis
* Flexible schema with MongoDB

---

### 🤖 Language Processing Service

Handles AI-related features:

* 🎙️ Speech-to-Text (WhisperX)
* 🔊 Text-to-Speech
* 🧠 Pronunciation Scoring
* 🌐 Translation (Gemini)
* 🔗 Sentence Alignment

---

### 📡 Notification Service

* Event-driven notifications via Kafka

---

## 🎯 Key Features

* 🎧 Shadowing with **audio & YouTube**
* ⏱️ Precise segment playback (start/end + padding)
* 🗣️ Voice recording & pronunciation analysis
* 📊 Real-time feedback on speaking
* 📖 Interactive transcript with sentence navigation
* 🔄 Auto-play & auto-stop learning mode

---

## ⚙️ System Highlights

* 🔥 Microservices with independent scalability
* ⚡ Real-time audio/video synchronization
* 🧠 AI-powered language understanding
* 📡 Event-driven architecture using Kafka
* 🔐 Secure authentication via Keycloak

---

## 🚀 Getting Started

### 1. Clone repository

```bash
git clone <your-repo>
cd EnglishLearning
```

---

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

---

### 3. Access services

* Frontend: http://localhost:3000, http://localhost:3001
* API Gateway: http://localhost:8080
* Keycloak: http://localhost:8088

---

## 📌 Future Improvements

* Kubernetes deployment
* Real-time transcript highlighting
* Loop-based shadowing training
* AI-powered speaking evaluation improvements

---

## 👨‍💻 Author

Developed as a full-stack learning platform combining:

* Microservices architecture
* AI/ML integration
* Real-time media processing

---

## ⭐ Notes

This project demonstrates:

* Advanced system design
* AI integration in real-world applications
* Scalable backend architecture
* Modern frontend UX for education systems
