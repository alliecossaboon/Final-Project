# Avi Sustain Index

## Description
The Avi-Sustain Index is a web application designed to help users better understand the environmental impact of commercial air travel. By allowing users to enter a flight route using airport IATA codes, the application calculates an estimated carbon dioxide emission per passenger based on real-world airport coordinates and flight distance. The goal of the project is to make aviation-related emissions more transparent and accessible to the general public, supporting more informed travel decisions and increased awareness of aviation’s environmental footprint.

The application features an interactive carbon calculation tool, a visual map of the flight route, and a recent search history displayed through a chart. All calculations are performed dynamically using real external data, and results are presented in a clear and user friendly interface.

## Target browsers
This application is designed to run on modern desktop browsers, including Google Chrome, Firefox, Microsoft Edge, and Safari. The layout is responsive and usable on mobile browsers, though it is primarily optimized for desktop use.




## Developer Manual

# Overview
The Avi-Sustain Index is a web based application designed to estimate carbon dioxide emissions per passenger for commercial flight routes. The application allows users to enter a route using airport IATA codes and returns an estimated distance and carbon emissions value. The system combines a static front end, serverless backend APIs, an external dataset for airport coordinates, and a Supabase database for persistent search history storage. The application is deployed using Vercel.

This manual describes the application architecture, backend endpoints, data sources, and instructions for future developers who may want to maintain or extend the project.

# Application Architecture
The project uses a serverless architecture. The front end consists of static HTML, CSS, and JavaScript files served by Vercel. Backend functionality is implemented using Vercel Serverless Functions located in the api/ directory. These functions handle calculation logic and database interaction. The front end communicates with the backend exclusively through Fetch API calls.

The project uses two authored API endpoints:
 - /api/score for calculating flight distance and carbon emissions
 - /api/searches for reading from and writing to a Supabase database

External JavaScript libraries are used for visualization and mapping, and Supabase is used as a hosted PostgreSQL database.

# External Data Sources
The application relies on two external data sources:

- OurAirports Dataset
    Airport latitude and longitude data are retrieved from the publicly available OurAirports dataset, accessed as a CSV file hosted online. This dataset provides airport IATA codes and geographic coordinates, which are used to calculate flight distance using the Haversine formula.

- Supabase Database
    Supabase is used as the external database required by the project rubric. It stores recent flight search results, including route information, estimated distance, emissions per passenger, and timestamps. This data is retrieved by the frontend to populate the “Recent Searches” chart.

# Backend API Endpoints
- POST /api/score
    This endpoint accepts a JSON request containing a flight route string (for example, "LAX to JFK"). The route is parsed to extract departure and arrival IATA codes. The server retrieves airport coordinates from the OurAirports dataset and calculates the great circle distance using the Haversine formula. Carbon emissions per passenger are estimated using a fixed emissions factor. The endpoint returns the route, distance, emissions value, and calculation source.
    
    This endpoint performs data processing and manipulation on external data, satisfying the requirement for an authored API that consumes and transforms data.

 - GET /api/searches
    This endpoint retrieves the most recent flight searches stored in the Supabase database. Results are ordered by timestamp and limited to a fixed number of entries. The frontend uses this data to generate a bar chart showing recent emissions estimates.

- POST /api/searches
    This endpoint inserts a new search record into the Supabase database after a successful calculation. It stores the route, distance, emissions value, and timestamp. This endpoint allows persistent storage of user interactions and satisfies the requirement for database write functionality.

# Database Structure
The Supabase database contains a table named searches with the following fields:
    - query (text)
    - from_iata (text)
    - to_iata (text)
    - distance_km (integer)
    - co2_per_pax_kg (numeric)
    - created_at (timestamp)
    
Row Level Security is enabled, with public read and insert policies to allow access from the deployed application without authentication.

# Front-End Behavior
The front end application uses Fetch API calls to communicate with backend endpoints. When a user submits a flight route, the application sends a POST request to /api/score. Upon receiving a successful response, the results are displayed, the route is drawn on an interactive map using Leaflet, and the search is saved to Supabase via /api/searches. The recent search chart is then refreshed using data retrieved from the database.

Chart.js is used to visualize recent search data, and Leaflet is used to display the geographic route.

# Deployment
The application is deployed using Vercel. Vercel automatically serves static assets and executes serverless API functions. Supabase credentials are stored as environment variables in the Vercel project settings and are not included in the repository. This allows the deployed application to function without requiring any setup by the end user.

# Known Limitations and Bugs
The emissions values produced by the application are estimates and do not account for aircraft type, seating class, load factor, or operational efficiency. The flight path is approximated as a straight line between airports and does not reflect actual flight trajectories. The recent searches database is shared across users and is intended for demonstration purposes rather than long-term analytics.

# Future Development Roadmap
Future development could include aircraft specific emissions modeling, round trip calculations, user authentication, more detailed route mapping, and enhanced accessibility features. Additional database constraints and analytics could also be implemented to improve data quality and insights.