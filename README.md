# 🥗 Mosaic Kitchen AI

**AI-powered multicultural meal planning and grocery assistant for diverse households in the UK.**

> Built on PhD research in healthy eating practices, food waste, digital food platforms, and multicultural food consumption.

---

## 🌍 Vision

Mosaic Kitchen helps multicultural households make healthier, cheaper, and more culturally relevant food decisions.

Most meal planning applications are designed around mainstream Western diets and often overlook the needs of diverse communities. Mosaic Kitchen bridges this gap by combining AI-powered meal planning, cultural food knowledge, and grocery optimisation into a single platform.

### Research Inspiration

Mosaic Kitchen is informed by doctoral research on:

- Healthy eating practices
- Food waste reduction
- Digital food platforms
- Everyday food consumption
- Ethnicity and food culture
- Household food routines

A key insight from this research is that people often struggle with healthy and sustainable eating not because of a lack of knowledge, but because of time constraints, disrupted routines, cultural preferences, and everyday practical challenges.

---

## 🥢 Key Principles

- Cultural food preferences matter
- AI should support everyday routines
- Reduce food waste before it happens
- Save money through smarter planning
- Support multicultural households
- Make healthy eating easier, not harder

---

## 👥 Target Users

### Primary Users (MVP)

- Chinese households in the UK
- International students
- Asian families
- Busy professionals

### Future Expansion

- Halal households
- Japanese households
- Korean households
- South Asian households
- Multicultural families

---

# 🚀 Product Roadmap

## MVP 0.5 — React Web Application

Goal: Validate core product value quickly.

### Features

- AI meal planning
- Grocery list generation
- Cultural cuisine preferences
- Budget-aware meal planning
- Fridge inventory (manual input)
- Food waste reduction suggestions
- English + Simplified Chinese interface

---

## MVP 1.0 — SwiftUI iOS Application

Goal: Mobile-first experience.

### Features

- All MVP 0.5 functionality
- Native iOS experience
- Push notifications
- Expiration date reminders
- Improved inventory management
- TestFlight release

###### Smart Food Expiry Notifications

Users receive notifications when ingredients are approaching their expiry date.

Notification example:

⚠️ Your spinach expires in 2 days.

Choose an action:

1. Discard
   - Estimate food waste cost
   - Log waste statistics

2. Use While Fresh
   - Generate recipes using fresh ingredients

3. Use Later
   - Generate leftover-friendly recipes
   - Suggest preservation methods

---

## V2 — Personalisation & Food Intelligence

### Features

## V2 — AI Food Intelligence

### AI Vision Inventory Recognition

Users can upload photos of:

- Fridges
- Pantries
- Grocery bags

OpenAI Vision identifies ingredients and automatically updates the inventory database.

---

### RAG-Powered Food Knowledge System

The recommendation engine combines:

- User preferences
- Historical meal plans
- Inventory data
- Food knowledge retrieval
- Cultural cuisine knowledge

to generate more personalised meal plans.

---

### Food Waste Prevention Workflow

Expiry notification

↓

User selects:

Discard
Use While Fresh
Use Later

↓

AI generates an appropriate action plan.

↓

Inventory and food waste records update automatically.

---

## V3 — Grocery Ecosystem Integration

### Potential Integrations

- Tesco
- Sainsbury's
- Asda
- Morrisons
- UKCNSHOP
- Longdan
- Wing Yip
- Japan Centre
- Hungry Panda

---

# 🏗 Tech Stack

| Layer | Technology |
|---------|---------|
| Web Frontend | React + Vite |
| Mobile Frontend | SwiftUI |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI API |
| Vector Search (V2) | pgvector |
| Storage | Supabase Storage |
| Deployment | Render + Vercel |
| Testing | Jest + Supertest |
| Version Control | GitHub |

---

# 🌐 Bilingual MVP

Mosaic Kitchen is designed as a bilingual product from day one.

### Supported Languages

- 🇬🇧 English
- 🇨🇳 Simplified Chinese

Future versions may support:

- 🇯🇵 Japanese
- 🇰🇷 Korean
- 🇸🇦 Arabic
- 🇮🇳 Hindi

---

# 📁 Project Structure

```text
mosaic-kitchen/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   └── package.json
│
├── web/
│
├── ios/
│
└── README.md
```

---

# 🛠 Local Development

```bash
git clone https://github.com/cosmicoral/Mosaic-Kitchen-AI.git

cd Mosaic-Kitchen-AI/backend

npm install

npm run dev
```

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
```

Future versions may additionally use:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

---

# 📌 Development Status

## ✅ Completed

- [x] GitHub repository setup
- [x] Express backend skeleton
- [x] OpenAI API integration
- [x] Meal planning endpoint
- [x] Dynamic prompt generation
- [x] JSON response generation
- [x] Local API testing via curl

---

## 🔄 In Progress

- [ ] Structured JSON formatting
- [ ] Supabase database integration
- [ ] User profile model
- [ ] Inventory management API

---

## 📋 Next Milestones

- [ ] React frontend (MVP 0.5)
- [ ] Bilingual UI
- [ ] Fridge inventory feature
- [ ] Grocery list page
- [ ] SwiftUI iOS version
- [ ] TestFlight deployment

---

## 🤖 Future AI Capabilities

Planned AI features include:

- Personalised meal planning
- Retrieval-Augmented Generation (RAG)
- Food inventory reasoning
- Food waste prediction
- Cultural cuisine recommendations
- AI-powered ingredient substitution
- Vision-based ingredient recognition
- Behaviour-aware food recommendations

# 🎯 Long-Term Goal

Become the AI decision layer connecting multicultural households with the UK food ecosystem.

Helping users answer questions such as:

- What should I cook this week?
- What ingredients do I already have?
- What is about to expire?
- What should I buy?
- How can I reduce food waste?
- How can I stay within budget?

By combining AI, cultural food knowledge, and grocery intelligence, Mosaic Kitchen aims to make food planning simpler, healthier, and more sustainable.

---
## 📚 Research Background

Mosaic Kitchen is informed by doctoral research on:

- Healthy eating practices
- Food waste reduction
- Digital food platforms
- Ethnicity and food culture
- Household food consumption

Research profile:

Google Scholar:
[View Publications](https://scholar.google.com/citations?user=Gp9ylswAAAAJ)

PhD Thesis:
Everyday Practices, Identities and Materiality of Food Consumption and Waste:
A Case Study of Middle-Class Consumers in Kunming (China)

University of Surrey, 2026

---

Built in London 🇬🇧

By Coral Yu Han