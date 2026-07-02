# 🌟 CMS

*A streamlined Complaint Management System (CMS) for registering, assigning, and tracking user grievances. Built to ensure timely resolutions, improve workflow transparency, and boost overall satisfaction.*

![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

---

## 🚀 About The Project

This project provides a centralized, easy-to-use platform for handling organizational complaints. It uses a separate client-server architecture for maximum scalability. Users can securely submit grievances, while administrators get a dedicated dashboard to review, assign, and resolve tickets efficiently.

## ✨ Key Features

**🔐 Secure Authentication:** Role-based access ensures that standard users and administrators only see what they need to. This protects sensitive data and keeps the platform secure for everyone involved.

**📊 Real-Time Tracking:** Users can monitor the exact status of their submitted grievances at any time. This transparency keeps users informed from the moment a ticket is submitted until its final resolution.

**⚙️ Admin Dashboard:** Administrators are equipped with powerful backend tools to filter, assign, and resolve incoming tickets quickly. This centralized view significantly improves workflow efficiency and response times.

## 🛠️ Technology Stack

The system is fully powered by the modern MERN stack. We utilize MongoDB to efficiently store and query all system data. Express and Node.js are used to securely handle the backend APIs and application logic, while React provides a fast, dynamic single-page user interface.

## 💻 Local Setup

You will need Node.js and MongoDB installed on your system to get started. Clone the repository and navigate into the project directory to begin setting up the separate client and server environments. 

```bash
git clone [https://github.com/parikshit122/CMS.git](https://github.com/parikshit122/CMS.git)
cd CMS

# Start the Backend Server
cd server
npm install
npm start

# Start the Frontend Client (in a new terminal)
cd ../client
npm install
npm run dev
