 🎵 BookMyArtist



 Artist Booking and Event Management System



BookMyArtist is a web-based artist booking platform developed as a final-year ICT project at Sol Plaatje University.



The system connects event organisers with artists, DJs, musicians and other entertainers through a centralised platform. It simplifies artist discovery, booking requests, availability management, communication and payment administration.



 📌 Project Overview



Traditional artist booking processes often involve informal communication, uncertain availability, booking conflicts and inefficient payment coordination.



BookMyArtist addresses these challenges by providing an organised digital platform where customers can browse artists, submit booking requests and track their bookings, while artists can manage their profiles, schedules and booking requests.



 ✨ Key Features



 👤 Customer Features

- Register and log in to the platform

- Browse and search for artists

- View artist profiles, genres and booking rates

- Check artist availability

- Submit booking requests for events

- Track booking statuses

- Communicate with artists through the messaging system

- Access payment information and manage bookings

- Submit artist reviews



 🎤 Artist Features

- Register and manage an artist profile

- Upload profile images and artist information

- Manage booking rates and availability

- View and respond to booking requests

- Accept or reject bookings

- Communicate with customers

- View booking history and reviews

- Access an artist dashboard



 🛡️ Administrator Features

- Access a dedicated administrative dashboard

- Manage registered users

- Manage artist accounts

- Monitor and manage bookings

- View customer contact messages

- Oversee platform activities



 🛠️ Technologies Used



| Technology | Purpose |

|---|---|

| HTML5 | Web page structure |

| CSS3 | Styling and responsive layouts |

| JavaScript | Client-side functionality |

| Node.js | Server-side JavaScript runtime |

| Express.js | Web application framework |

| EJS | Dynamic page rendering |

| MySQL | Relational database management |

| mysql2 | Database connectivity |

| bcrypt | Password hashing |

| express-session | User session management |

| Multer | File upload handling |

| Git and GitHub | Version control and source code management |



 🔄 Booking Workflow



1\. A customer browses available artists.

2\. The customer selects an artist and submits a booking request.

3\. The artist reviews the booking details.

4\. The artist accepts or rejects the request.

5\. The customer follows the payment instructions for an accepted booking.

6\. Payment administration and confirmation are handled through the system's booking and payment workflow.

7\. The customer and artist can monitor their bookings through their respective dashboards.



 📂 Project Structure



```text

BookMyArtist/

├── controllers/        Application business logic

├── database/           Database connection

├── middleware/         Authentication and upload middleware

├── public/

│   ├── css/            Stylesheets

│   ├── images/         Website images

│   └── js/             Client-side JavaScript

├── routes/             Express application routes

├── uploads/            Default artist image and upload directory

├── views/              EJS page templates

├── server.js           Application entry point

├── package.json        Project dependencies

├── package-lock.json   Dependency lock file

└── .gitignore          Files excluded from version control

```



 💻 Installation and Setup



 Prerequisites



- Node.js and npm

- MySQL Server

- Git

- A code editor such as Visual Studio Code



 1. Clone the repository



```bash

git clone https://github.com/BigBoy27052004/BookMyArtist.git

```



 2. Navigate to the project directory



```bash

cd BookMyArtist

```



 3. Install dependencies



```bash

npm install

```



 4. Configure the environment



Create a `.env` file in the project root and configure the environment variables required by the database connection and application server.



Important: The `.env` file is intentionally excluded from GitHub to protect credentials and other sensitive information.



 5. Set up the database



Create and configure the required MySQL database and tables using the project's database schema. The database connection is implemented in `database/db.js`.



Note: A separate database schema or SQL setup script must be provided for a complete installation.\*



 6. Start the application



Start the application using the Node.js command supported by the project:



```bash

node server.js

```



Open the local address and port configured by the application in your browser.



 🔐 Security Features



- Password hashing using bcrypt

- Session-based authentication

- Role-based access control

- Protected routes and middleware

- Separation of environment credentials from source code

- Controlled handling of uploaded files



 🎯 Project Objectives



- Simplify the artist booking process

- Reduce booking conflicts through availability management

- Improve communication between customers and artists

- Centralise booking information

- Support effective booking and payment administration

- Provide dedicated interfaces for different system users



 🚀 Future Enhancements



Potential future improvements include:



- Integrated online payment gateways

- Automated email and SMS notifications

- More advanced artist recommendations

- Improved reporting and analytics

- Mobile application support



 🎓 Academic Information


Project Name: BookMyArtist  

Institution: Sol Plaatje University  

Qualification: Advanced Diploma in Information and Communication Technology  

Specialisation: Application Development  

Year: 2026



 📄 Disclaimer



BookMyArtist was developed for academic and demonstration purposes. Artist names and promotional images used in the system are illustrative and do not imply official partnerships, endorsements or commercial affiliations.



---



Developed as part of the Advanced Diploma in ICT at Sol Plaatje University.



