# Electronics Repair App

A modern web application for managing electronics repair services, built with React, TypeScript, and Tailwind CSS.

## Features

- **Dark/Light Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Socket.io integration for live updates
- **Form Validation**: Comprehensive form validation system
- **Authentication**: User authentication and authorization
- **PWA Support**: Installable as a progressive web app

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React Query, React Context
- **Routing**: React Router v6
- **Forms**: React Hook Form with Yup validation
- **Real-time**: Socket.io client
- **UI Components**: Custom components with accessibility in mind
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 16+ and npm 8+

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/electronics-repair-app.git
   cd electronics-repair-app/frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Update the environment variables in `.env` as needed.

4. Start the development server
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm run test` - Run tests

## Project Structure

```
src/
├── assets/            # Static assets
├── components/        # Reusable UI components
│   ├── common/        # Common components (buttons, inputs, etc.)
│   ├── forms/         # Form components
│   └── layout/        # Layout components
├── config/            # App configuration
├── contexts/          # React contexts
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── routes/            # Route definitions
├── services/          # API services
├── styles/            # Global styles
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── App.tsx            # Main App component
└── main.tsx           # App entry point
```

## Theming

The app supports both light and dark modes. The theme can be toggled using the theme toggle button in the header.

### Adding Dark Mode Styles

Use the `dark:` variant in your Tailwind classes to apply styles in dark mode:

```jsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
