# Rimworld Documentation App

A modern, responsive web application for browsing Rimworld game documentation. This app provides an intuitive interface to explore the game's codebase structure, classes, methods, and APIs.

## Features

- **📚 Comprehensive Documentation**: Browse all Rimworld classes, interfaces, structs, and enums
- **🔍 Advanced Search**: Search by class names, method signatures, or file names
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🎨 Modern UI**: Dark theme with syntax highlighting and clean navigation
- **⚡ Fast Performance**: Optimized loading and search functionality
- **🔗 Deep Linking**: Direct links to specific types and namespaces

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rimworld-docs
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── docs-home/          # Main documentation overview
│   │   ├── type-view/          # Individual type details
│   │   ├── namespace-view/     # Namespace browsing
│   │   └── search/             # Search functionality
│   ├── models/
│   │   └── docs.models.ts      # TypeScript interfaces
│   ├── services/
│   │   └── docs.service.ts     # Data loading and search logic
│   ├── app.component.*         # Main app component
│   ├── app.routes.ts           # Routing configuration
│   └── app.config.ts           # App configuration
├── assets/
│   └── docs_index.json         # Documentation data
└── styles.scss                 # Global styles
```

## Data Format

The app uses a JSON index file (`docs_index.json`) with the following structure:

```json
{
  "generated_at": "2025-08-20T18:34:04.974369",
  "total_namespaces": 1,
  "total_types": 463,
  "namespaces": {
    "<global>": {
      "name": "<global>",
      "type_count": 463,
      "types": [
        {
          "name": "ClassName",
          "kind": "class",
          "full_name": "ClassName",
          "file": "ClassName.cs",
          "line": 10,
          "member_count": 3,
          "members": [
            {
              "kind": "method",
              "signature": "public void MethodName()",
              "line": 15
            }
          ]
        }
      ]
    }
  }
}
```

## Usage

### Browsing Documentation

1. **Home Page**: View an overview of all namespaces and types
2. **Namespace View**: Browse all types within a specific namespace
3. **Type View**: See detailed information about a specific type including all its members

### Searching

1. Use the search bar in the header for quick searches
2. Visit the dedicated search page for advanced search functionality
3. Search by:
   - Class names (e.g., "Pawn", "Thing")
   - Method names (e.g., "DoWork", "Tick")
   - File names (e.g., "Pawn.cs", "Thing.cs")
   - Keywords in method signatures

### Navigation

- **Breadcrumbs**: Navigate back through the hierarchy
- **Type Icons**: Visual indicators for different type kinds
- **Member Counts**: See how many members each type has
- **File References**: Direct links to source file locations

## Technology Stack

- **Angular 17**: Modern web framework with standalone components
- **TypeScript**: Type-safe JavaScript
- **SCSS**: Advanced CSS with variables and mixins
- **RxJS**: Reactive programming for data streams
- **Angular Router**: Client-side routing

## Development

### Code Style

- Follow Angular style guide
- Use TypeScript strict mode
- Implement responsive design patterns
- Ensure accessibility compliance

### Adding New Features

1. Create new components in `src/app/components/`
2. Add routes in `src/app/app.routes.ts`
3. Update services as needed
4. Add corresponding styles

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Rimworld game developers for the source code
- Angular team for the excellent framework
- Community contributors and feedback

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
