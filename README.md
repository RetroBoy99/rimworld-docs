# Rimworld Documentation App

A modern, responsive web application for browsing Rimworld game documentation. This app provides an intuitive interface to explore the game's codebase structure, classes, methods, and APIs with developer comments and XML/translation usage tracking.

## Features

- **📚 Comprehensive Documentation**: Browse all Rimworld classes, interfaces, structs, and enums
- **🔍 Advanced Search**: Search by class names, method signatures, or file names
- **📝 Developer Comments**: View developer notes and explanations for types and members
- **📊 XML & Translation Stats**: Track XML class usage and translation key usage
- **🎯 Category Navigation**: Browse by type categories (Classes, Enums, Interfaces, Structs)
- **🔗 Deep Linking**: Direct links to specific types, members, and categories
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🎨 Modern UI**: Dark theme with syntax highlighting and clean navigation
- **⚡ Fast Performance**: Optimized loading, lazy loading, and search functionality

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
│   │   ├── docs-home/              # Main documentation overview
│   │   ├── type-view/              # Individual type details with comments
│   │   ├── category-view/          # Category browsing (Classes, Enums, etc.)
│   │   ├── search/                 # Search functionality
│   │   ├── xml-translation-stats/  # XML and translation usage statistics
│   │   ├── xml-usage/              # XML usage display component
│   │   ├── translation-usage/      # Translation usage display component
│   │   └── comment-display/        # Developer comments display
│   ├── models/
│   │   └── docs.models.ts          # TypeScript interfaces
│   ├── services/
│   │   └── docs.service.ts         # Data loading, search, and comments logic
│   ├── app.component.*             # Main app component with navigation
│   ├── app.routes.ts               # Routing configuration
│   └── app.config.ts               # App configuration
├── assets/
│   ├── docs_index.json             # Main documentation data
│   ├── comments.json               # Developer comments and notes
│   ├── xml_class_links.json        # XML class usage data
│   └── translation_links.json      # Translation key usage data
└── styles.scss                     # Global styles
```

## Data Files

### Main Documentation (`docs_index.json`)
Contains all Rimworld types with their members, signatures, and metadata.

### Developer Comments (`comments.json`)
Contains developer notes and explanations for types and members:

```json
{
  "comments": {
    "Assembly-CSharp.Version.Verse.ThingDef": "Base class for all things in Rimworld - items, buildings, creatures, etc. This is the foundation of the game's object system.",
    "Assembly-CSharp.Version.Verse.Pawn.health": "HealthTracker component that manages injuries, diseases, and body parts. Critical for survival mechanics.",
    "Assembly-CSharp.Version.Verse.Pawn.Kill(DamageInfo, Hediff)": "Kills the pawn with the specified damage. Used for combat, accidents, and scripted events."
  },
  "metadata": {
    "last_updated": "2025-08-23T22:10:00Z",
    "total_comments": 10,
    "version": "1.0",
    "description": "Developer comments and notes for Rimworld documentation"
  }
}
```

### XML Class Links (`xml_class_links.json`)
Tracks which XML files use which C# classes.

### Translation Links (`translation_links.json`)
Tracks translation key usage in C# code and XML files.

## Adding Developer Comments

### Comment Key Format

Comments use a specific key format to identify types and members:

- **Type Comments**: `Assembly-CSharp.Version.Namespace.TypeName`
- **Member Comments**: `Assembly-CSharp.Version.Namespace.TypeName.MemberName`
- **Method Comments**: `Assembly-CSharp.Version.Namespace.TypeName.MethodName(ParamType1, ParamType2)`

### Examples

```json
{
  "comments": {
    "Assembly-CSharp.Version.Verse.ThingDef": "Base class for all things in Rimworld",
    "Assembly-CSharp.Version.Verse.Pawn.health": "HealthTracker component for injuries and diseases",
    "Assembly-CSharp.Version.Verse.Pawn.Kill(DamageInfo, Hediff)": "Kills the pawn with specified damage"
  }
}
```

### Adding New Comments

1. Open `src/assets/comments.json`
2. Add your comment using the correct key format
3. Update the metadata:
   - `total_comments`: Count of all comments
   - `last_updated`: Current timestamp
4. Save the file

### Key Generation Rules

- **Namespace**: Extracted from the type's file path (e.g., `Verse` from `Assembly-CSharp\Verse\TypeName.cs`)
- **Method Parameters**: Include parameter types for method overloads (e.g., `Kill(DamageInfo, Hediff)`)
- **Case Sensitivity**: Member names must match exactly (e.g., `compClass` not `CompClass`)

## Usage

### Browsing Documentation

1. **Home Page**: View an overview of all types with category filtering
2. **Category View**: Browse types by category (Classes, Enums, Interfaces, Structs)
3. **Type View**: See detailed information about a specific type including:
   - Developer comments
   - Member details with comments
   - Inheritance information
   - XML usage
   - Translation usage
   - Method override relationships

### Searching

1. **Header Search**: Use the search bar in the header for quick searches
2. **Search Page**: Visit the dedicated search page for advanced search functionality
3. **Search Types**:
   - Class names (e.g., "Pawn", "Thing")
   - Method names (e.g., "DoWork", "Tick")
   - File names (e.g., "Pawn.cs", "Thing.cs")
   - Keywords in method signatures

### XML & Translation Stats

1. **Statistics Tab**: Overview of XML and translation usage
2. **XML Class Usage**: Browse XML tag groups and see which classes are used
3. **Translation Keys**: Browse translation keys and their usage in code and XML

### Navigation

- **Categories Dropdown**: Quick access to type categories
- **Breadcrumbs**: Navigate back through the hierarchy
- **Type Icons**: Visual indicators for different type kinds
- **Member Counts**: See how many members each type has
- **Direct Links**: Copy links to specific members and types

## Technology Stack

- **Angular 17**: Modern web framework with standalone components
- **TypeScript**: Type-safe JavaScript
- **SCSS**: Advanced CSS with variables and mixins
- **RxJS**: Reactive programming for data streams
- **Angular Router**: Client-side routing with deep linking
- **Angular Signals**: Modern state management

## Development

### Code Style

- Follow Angular style guide
- Use TypeScript strict mode
- Implement responsive design patterns
- Ensure accessibility compliance
- Use Angular signals for state management

### Adding New Features

1. Create new components in `src/app/components/`
2. Add routes in `src/app/app.routes.ts`
3. Update services as needed
4. Add corresponding styles

### Performance Optimizations

- Lazy loading for large datasets
- Search result caching
- Pagination for large lists
- Optimized SCSS with variables and mixins

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the GPL-3.0  License - see the LICENSE file for details.

## Acknowledgments

- Rimworld game developers for the source code
- Angular team for the excellent framework
- Community contributors and feedback

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
