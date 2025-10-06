# 🧠 Study-AI

**Study-AI** is an **AI-powered learning assistant** that helps students instantly convert their **lecture materials, PDFs, images, and text documents** into **concise study notes** and **interactive flashcards**.
Built with **React** and **Supabase**, Study-AI saves time, enhances study efficiency, and supports **active recall learning**.

---

## 🚀 Features

### 📄 Document Upload

* Upload **PDF, PNG, JPEG, TXT** files (up to **50MB**)
* Stored securely in **Supabase Storage**
* Supports document versioning for easy updates

### 🔍 OCR & Text Extraction

* Automatically converts images and scanned PDFs into text.
* Cleans and formats text by removing headers, watermarks, and noise

### 📝 Notes Generation

* Generates summarized notes.
* Highlights key concepts and terms
* Notes are editable by users for personalized study material

### 🎓 Flashcard Creation

* Auto-generates **Q&A flashcards** from notes
* Users can create, edit, or delete cards
* Includes **optional spaced repetition** for memory retention

### 📊 Dashboard & Analytics

* Displays uploaded documents, notes, and flashcards
* Tracks study progress: learned cards, pending reviews, and completion rate
* Includes **search & filter** for quick access

### 🔐 Role-Based Access Control

| Role              | Capabilities                                      |
| ----------------- | ------------------------------------------------- |
| **Student**       | Upload docs, view notes, generate/edit flashcards |
| **Admin/Teacher** | Upload materials, manage content, monitor usage   |

---

## 🧩 Architecture Overview

| Component          | Technology                                                            |
| ------------------ | --------------------------------------------------------------------- |
| **Frontend**       | React, Tailwind CSS                                                   |
| **Backend**        | Supabase (Auth, Database, Storage, Edge Functions)                    |
| **Authentication** | Supabase Auth (JWT-based)                                             |
| **Database**       | Supabase PostgreSQL (Tables: users, documents, notes, flashcards)     |

<img width="2828" height="1281" alt="Screenshot 2025-10-06 173807" src="https://github.com/user-attachments/assets/2bd640ef-3066-4ce7-90ce-35aa72780356" />
<img width="2855" height="1547" alt="Screenshot 2025-10-06 173906" src="https://github.com/user-attachments/assets/7de12d80-ef31-486c-9fc8-e9a9a6f30bfa" />
<img width="2868" height="1531" alt="Screenshot 2025-10-06 173849" src="https://github.com/user-attachments/assets/bcc0308b-a1a2-45db-8237-b25b2d8a323b" />

