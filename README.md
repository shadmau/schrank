# Schrank: NFT Trading Dashboard

Schrank is an advanced NFT trading dashboard designed to empower traders with advanced data and insights. It provides comprehensive information on bid depths, floor sales, and price trends to facilitate informed decision-making.

## Features

- Advanced NFT collection metrics (floor prices, bid changes, sales data)
- Interactive dashboard with card and table views
- Advanced filtering and sorting options
- Dynamic price charts with customizable time ranges
- Responsive design for seamless use across devices

## Live Demo

[View Live Demo](https://schrank.xyz)

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Express.js, MySQL
- **Data Crawling**: Puppeteer
- **Styling**: Tailwind CSS, Shadcn UI
- **Data Visualization**: Recharts

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MySQL

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/shadmau/schrank.git
   cd schrank
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Project Structure

```
schrank/
── frontend/
| ── src/
| | ── app/
| | | ── page.tsx    # Main dashboard component
| | ── components/
| |── utils/
|── public/
── backend/
| ── src/
| | ── config/
| | ── models/
| |── services/
|── index.ts
── README.md
```

## Key Components

### Dashboard

The main dashboard component manages the state for collections, loading status, and view preferences.

### Data Fetching

Real-time data is fetched from the backend API and processed for display.

### Filtering and Sorting

Collections can be filtered and sorted based on various criteria.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
