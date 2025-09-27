# Celora Navigation Sidebar

En moderne sidebar-navigasjonsløsning for Celora-plattformen, med støtte for både desktop- og mobilvisning.

## Funksjoner

- **Responsivt design** - Fungerer sømløst på både desktop og mobile enheter
- **Kollapsbart grensesnitt** - Kan minimeres for å gi mer plass til innhold
- **Mørk tema** - Stilig design med Celoras signatur-cyberpunk-estetikk
- **Animasjoner** - Myke overganger og animasjoner for bedre brukeropplevelse
- **Tilgjengelighet** - Inkluderer ARIA-attributter og fokushåndtering

## Hvordan teste

For å sammenligne de to navigasjonsløsningene:

1. **Original design**: Besøk hovedsiden på `/`
2. **Ny sidebar-design**: Besøk `/sidebar`-ruten

## Tekniske detaljer

Sidebar-navigasjonen inkluderer:

- Tilstandshåndtering for å veksle mellom utvidet og minimert visning
- Mobiloptimalisering med egen hamburger-knapp på små skjermer
- Automatisk erkjennelse av skjermstørrelse for å velge riktig layout
- Fokus på ytelse og lite fotavtrykk

## Implementering

Sidebar-navigasjonen er implementert som en React-komponent som kan brukes uavhengig av andre komponenter i Celora-prosjektet. Den er designet for å fungere med Next.js og TailwindCSS.

```tsx
// Eksempel på bruk
import { NavigationSidebar } from '../components/NavigationSidebar';

export default function Layout({ children }) {
  return (
    <>
      <NavigationSidebar />
      <div className="md:ml-64">
        {/* Innhold her */}
        {children}
      </div>
    </>
  );
}
```