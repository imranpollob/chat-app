### **Project Summary**

This is a real-time chat application using a full-stack JavaScript (MERN) architecture. The core of the application is to allow users to create, join, and manage chatrooms with varying levels of privacy.



**Key Objectives:**

* **Real-Time Communication:** To enable instant, bidirectional messaging between users within a chatroom.
* **User & Room Management:** To provide users with the ability to register, log in, and control their chatrooms.
* **Variable Privacy:** To offer three distinct chatroom types to cater to different user needs: Public, Private (invite-only), and Request-to-Join.
* **Persistent Data:** To save user information, room details, and message history in a database.

**Technology Stack:**

* **Frontend:** **React.js** for a dynamic, single-page user interface.
* **Backend:** **Node.js** with the **Express.js** framework to build a robust and scalable server.
* **Real-Time Engine:** **Socket.IO** to manage persistent WebSocket connections for instant messaging.
* **Database:** **MongoDB** (with Mongoose) to store all application data, including users, messages, and room information.


**Core MVP Features:**

1.  **User Authentication:** Secure user registration and login functionality.
2.  **Profile Management:** Basic user profiles with unique, identifiable usernames.
3.  **Chatroom Creation:** Users can create new chatrooms, specifying a name, description, and one of three types:
    * **Public:** Discoverable and open for anyone to join.
    * **Request-to-Join:** Discoverable, but requires owner approval to join.
    * **Private:** Hidden and accessible only via direct invitation from the owner.
4.  **Room Discovery & Joining:** A public list to browse and join open rooms.
5.  **Real-Time Messaging:** Instantaneous sending and receiving of text messages within rooms.
6.  **Room Administration:** Room owners can manage join requests for their rooms and invite users to private rooms.

**Development Plan:**

The project will be built iteratively across three distinct phases:

* **Phase 1 (Tasks 1-5):** Focuses on creating the fundamental real-time chat engine. This phase will result in a functional, single-room anonymous chat application.
* **Phase 2 (Tasks 6-9):** Introduces user identity and database persistence. This phase adds user registration/login and saves all message history to MongoDB.
* **Phase 3 (Tasks 10-13):** Implements the advanced multi-chatroom functionality, including room creation, management, and the logic for all three privacy levels.

