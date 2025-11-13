# Empower Ability Labs — Accessible Single-Page Application (SPA)

This project is an accessible Single-Page Application (SPA) built for the **CST** final project.  
It follows **WCAG 2.1 AA guidelines**, **ARIA Authoring Practices**, and avoids using Bootstrap’s JavaScript as required.  
The goal is to create an inclusive, keyboard-friendly, screen-reader-accessible experience.

---

## **Team Members**

| Name | Student Number | Section Responsibility |
|------|----------------|------------------------|
| Ngabo Nsengiyumva | 041196196 |  |
| Aryan rudani | 041171391 | |
| Trevor Oliver Kutto | 041164341 |  |
| Bryan Chuinkam | 040811108 |  |


---

## **Project Overview**

Empower Ability Labs is a fictional organization focused on accessibility awareness and empathy-building.  
Our SPA includes:

- **Home**
- **Services**
- **Schedule a Call (Web Form)**
- **Interactive Components**
  - Accessible navigation bar (roving tabindex)
  - Lightbox/Modal
  - Switch/toggle
  - Show/Hide textarea (conditional UI)

All pages are rendered within a single HTML view, with JavaScript-driven routing, focus management, and dynamic page titles.

---

## **Features & Requirements Implemented**

### **1. Single-Page App Functionality**
- Client-side routing (no page reload)
- Browser Back/Forward button sync via History API
- Automatic focus shift to the most relevant heading on navigation
- Unique page titles per section

### **2. Layout & Design**
- Fully responsive layout
- Bootstrap 4 (CSS only) used as a styling baseline
- WCAG AA-validated color contrast
- Semantic layout with accessible landmarks and headings

### **3. HTML Semantics**
- Clear heading hierarchy (`h1 → h2 → h3`)
- Proper sectioning: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Meaningful alt text for all images

### **4. Interactive Components (No Bootstrap JS)**
- Custom-built accessible components:
  - Navigation bar with arrow-key support
  - Modal with focus trap + ESC to close
  - ARIA-compliant switch/toggle
  - Show/Hide textarea controlled by checkbox selection

### **5. Web Form**
- Keyboard-accessible form fields
- Field validation:
  - Email required
  - Phone number pattern (613-123-1234)
- ARIA live regions for error and success messages
- Thank-you confirmation on successful submission

---

## **Project Structure**

```
/
├── EmpowerAbilityLab.html
├── EmpowerAbilityLab.css
├── EmpowerAbilityLab.js
├── /images
│ ├── empowerabilitylabslogo.png
│ ├── services.png
│ └── scheduleacall.png
└── README.md
```