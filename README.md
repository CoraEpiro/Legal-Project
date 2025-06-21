# Azerbaijani Legal Assistant

A modern, AI-powered legal chatbot designed specifically for Azerbaijani users. This application provides reliable legal information and advice in the Azerbaijani language, backed by trusted legal sources and powered by advanced AI technology.

## 🚀 Features

- **🔐 Secure Authentication**: JWT-based user authentication with bcrypt password hashing
- **💬 Real-time Chat Interface**: Modern, responsive chat interface with message history
- **🤖 AI-Powered Responses**: Advanced legal search and AI synthesis using OpenAI GPT-4
- **📚 Trusted Legal Sources**: Integration with Google Custom Search for verified legal documents
- **🌐 Azerbaijani Language Support**: Full support for Azerbaijani language queries and responses
- **💾 Chat History**: Persistent chat history with user-specific conversations
- **📱 Responsive Design**: Modern UI that works on desktop, tablet, and mobile devices
- **🔍 Web & PDF Scraping**: Intelligent content extraction from legal websites and PDF documents

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Serverless Functions
- **Authentication**: JWT tokens with HTTPOnly cookies
- **AI**: OpenAI GPT-4 for intelligent responses
- **Search**: Google Custom Search API
- **Data Storage**: JSON files (users.json, conversations.json)
- **Styling**: Tailwind CSS with custom legal theme
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📋 Prerequisites

Before running this application, you need:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **OpenAI API Key** - Get from [OpenAI Platform](https://platform.openai.com/)
4. **Google Custom Search API Key** - Get from [Google Cloud Console](https://console.cloud.google.com/)
5. **Google Custom Search Engine ID** - Create at [Google Programmable Search Engine](https://programmablesearchengine.google.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd legal-project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Google Custom Search Configuration
GOOGLE_CSE_ID=your-google-custom-search-engine-id
GOOGLE_API_KEY=your-google-api-key

# Application Configuration
NODE_ENV=development
```

### 4. Configure Google Custom Search

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Create a new search engine
3. Add legal websites and government domains to your search engine
4. Note down your Search Engine ID
5. Enable the Custom Search API in Google Cloud Console
6. Create an API key with Custom Search API access

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
legal-project/
├── api/                    # API routes (serverless functions)
│   ├── auth/              # Authentication endpoints
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── me.ts
│   │   └── logout.ts
│   ├── chats.ts           # Chat management
│   ├── chat/[chatId].ts   # Individual chat operations
│   └── generate-answer.ts # AI response generation
├── app/                   # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   ├── globals.css        # Global styles
│   ├── users.json         # User data storage
│   └── conversations.json # Chat history storage
├── components/            # React components
│   ├── AuthInterface.tsx  # Authentication UI
│   ├── ChatInterface.tsx  # Main chat interface
│   ├── ChatSidebar.tsx    # Chat sidebar
│   ├── ChatMessage.tsx    # Individual message component
│   ├── ChatInput.tsx      # Message input component
│   ├── Header.tsx         # Application header
│   └── providers/         # Context providers
│       └── AuthProvider.tsx
├── lib/                   # Utility libraries
│   ├── user-store.ts      # User data management
│   ├── chat-store.ts      # Chat data management
│   ├── legal-search.ts    # Legal search functionality
│   └── utils.ts           # General utilities
└── types/                 # TypeScript type definitions
    └── index.ts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_SECRET` | Secret key for JWT tokens | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID | Yes |
| `GOOGLE_API_KEY` | Google API key | Yes |
| `NODE_ENV` | Environment (development/production) | No |

### Customizing Legal Sources

To customize the legal sources used by the chatbot:

1. Go to your Google Custom Search Engine settings
2. Add or remove websites from your search engine
3. Focus on official government websites, legal databases, and trusted legal resources
4. Recommended sources:
   - Official government websites
   - Legal databases
   - Court websites
   - Law firm websites (reputable ones)
   - Legal education institutions

## 🎨 Customization

### Styling

The application uses Tailwind CSS with a custom legal theme. You can customize the colors and styling by modifying:

- `tailwind.config.js` - Theme configuration
- `app/globals.css` - Global styles
- Individual component files for specific styling

### Adding New Features

To add new features:

1. Create new API routes in the `api/` directory
2. Add corresponding components in the `components/` directory
3. Update types in `types/index.ts`
4. Add any new utilities to the `lib/` directory

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Tokens**: Secure session management with HTTPOnly cookies
- **Input Validation**: Comprehensive validation on all user inputs
- **Rate Limiting**: Built-in protection against abuse
- **CORS Protection**: Proper CORS configuration
- **XSS Protection**: Sanitized HTML rendering

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `NEXTAUTH_SECRET` is set
   - Check that `NEXTAUTH_URL` matches your deployment URL

2. **AI Response Errors**
   - Verify your OpenAI API key is valid
   - Check your OpenAI account has sufficient credits
   - Ensure the API key has access to GPT-4

3. **Search Not Working**
   - Verify Google API key and Custom Search Engine ID
   - Check that the Custom Search API is enabled
   - Ensure your search engine has websites configured

4. **Build Errors**
   - Clear `.next` directory: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

### Debug Mode

To enable debug logging, add to your `.env.local`:

```env
DEBUG=true
```

## 📝 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Chat Endpoints

- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chat/[chatId]` - Get specific chat
- `POST /api/chat/[chatId]` - Add message to chat
- `DELETE /api/chat/[chatId]` - Delete chat

### AI Endpoints

- `POST /api/generate-answer` - Generate AI response

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT-4 API
- Google for the Custom Search API
- Next.js team for the amazing framework
- The Azerbaijani legal community for inspiration

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the API documentation
3. Open an issue on GitHub
4. Contact the development team

---

**Note**: This application is designed for educational and informational purposes. It should not be considered as legal advice. Users should consult with qualified legal professionals for specific legal matters.

## Environment Variables

For the application to work properly, you need to set up the following environment variables:

### Required Variables

Create a `.env.local` file in the root directory with:

```bash
# NextAuth Secret - CRITICAL for JWT token signing
NEXTAUTH_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Google Custom Search Configuration (optional, for enhanced legal search)
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here

# Environment
NODE_ENV=development
```

### Vercel Deployment

When deploying to Vercel, make sure to add these environment variables in your Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable from above
4. **IMPORTANT**: Generate a strong `NEXTAUTH_SECRET` for production

### Generating NEXTAUTH_SECRET

You can generate a secure secret using:

```bash
openssl rand -base64 32
```

Or use any random string generator with at least 32 characters.

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see above)
4. Run development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Technical Notes

- **Storage**: Uses file-based storage in development, in-memory storage in serverless environments (Vercel)
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **AI Integration**: OpenAI GPT for intelligent responses and translation
- **Responsive Design**: Tailwind CSS with mobile-first approach

## Deployment

The application is configured for Vercel deployment with:
- Automatic builds on git push
- Serverless function optimization
- Environment variable support
- Static asset optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 