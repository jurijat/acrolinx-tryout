# Acrolinx UI Tester

A modern web-based UI testing tool for the Acrolinx API built with SvelteKit and Svelte 5.

## Features

- Document validation via text input or file upload
- Real-time checking with progress tracking
- Score visualization and issue categorization
- Support for multiple languages and guidance profiles
- Check history (coming soon)
- Modern, responsive UI with Tailwind CSS

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**
   The `.env` file should contain:

```
ACROLINX_API_TOKEN=your-api-token
PUBLIC_ACROLINX_BASE_URL=https://your-tenant.acrolinx.cloud
PUBLIC_ACROLINX_CLIENT_SIGNATURE=your-signature
PUBLIC_ACROLINX_CLIENT_VERSION=1.0.0
PUBLIC_ENCRYPTION_KEY=your-encryption-key
```

3. **Run the development server:**

```bash
npm run dev
```

The app will be available at http://localhost:5173

## Development

- **Type checking:** `npm run check`
- **Linting:** `npm run lint`
- **Build:** `npm run build`
- **Preview production build:** `npm run preview`

## Tech Stack

- **SvelteKit** with Svelte 5 (runes API)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide Icons** for UI icons
- **DuckDB-WASM** for in-browser data storage (coming soon)

## Project Structure

```
src/
├── lib/
│   ├── components/      # UI components
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── utils/           # Helper functions
├── routes/
│   ├── api/            # API endpoints
│   └── +page.svelte    # Main page
```

## Usage

1. The app automatically authenticates using the API token from the environment
2. Enter or upload your document in the left panel
3. Select language and guidance profile
4. Click "Check Document" to validate
5. View results in the right panel with score and detailed issues
