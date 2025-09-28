# Multi-Factor Authentication (MFA) System

Dette dokumentet beskriver MFA-implementasjonen i Celora-applikasjonen, inkludert mobile og desktop-grensesnitt, språkstøtte og routing mellom enhetstypene.

## Arkitektur

MFA-systemet er bygget med følgende komponenter:

1. **Core Components**
   - `MfaVerification.tsx` - Desktop versjon av MFA verifisering
   - `MfaMobileVerification.tsx` - Mobil-optimalisert versjon av MFA verifisering
   - `MfaRecoveryProcess.tsx` - Desktop versjon av MFA gjenoppretting
   - `MfaRecoveryProcessMobile.tsx` - Mobil-optimalisert versjon av MFA gjenoppretting
   - `MfaSetup.tsx` - Desktop versjon av MFA oppsett
   - `MfaSetupMobile.tsx` - Mobil-optimalisert versjon av MFA oppsett

2. **Device Detection and Routing**
   - `MfaDeviceRouter.tsx` - Smart routing mellom desktop og mobile varianter
   - `MfaDeviceDetector.tsx` - Enhetsdeteksjon og preferansehåndtering

3. **Internationalization**
   - `mfaTranslations.ts` - Oversettelser for alle MFA-komponenter
   - `LanguageSwitcher.tsx` - UI-komponent for språkbytte
   - `userPreferencesClient.ts` - Håndterer brukerpreferanser inkludert språk

4. **App Routes**
   - `(mfa-mobile)/` - Rute-gruppe for mobile MFA-sider
   - `mfa-router/` - Omdirigering til riktig versjon basert på enhet
   - Standard ruter for desktop-versjoner

5. **Helpers**
   - `cookieHelper.ts` - Funksjoner for håndtering av cookies relatert til MFA
   - `auth.ts` - Autentiserings-utility-funksjoner

## Mobiloptimalisering

Følgende teknikker er brukt for å optimalisere MFA for mobile enheter:

1. **Touch-vennlige grensesnitt**
   - Større knapper og inputfelt
   - Bredere mellomrom mellom interaktive elementer
   - Touch-optimaliserte segmenterte inputfelt for koder

2. **Responsiv design**
   - Tilpasset layout for små skjermer
   - Viewport-metatagg for å forhindre zoom på iOS
   - Safe area insets for moderne mobile enheter

3. **Ytelsesoptimalisering**
   - Redusert animasjonsbruk på lavytelsesenheter
   - Optimaliserte bilder og ikoner for mindre båndbredde

4. **Plattformspesifikke forbedringer**
   - iOS-spesifikk styling for native-lignende opplevelse
   - Android-spesifikk styling for Material Design-lignende opplevelse

## Internasjonalisering

MFA-systemet støtter flere språk gjennom:

1. **Oversettelsessystem**
   - Støtter for øyeblikket Engelsk (en) og Norsk (no/nb)
   - Kan utvides med flere språk ved å legge til nye oversettelser

2. **Språkdeteksjon**
   - Automatisk deteksjon av brukerens foretrukne språk
   - Vekting basert på browser-innstillinger og tidligere preferanser

3. **Persistent språkvalg**
   - Lagrer språkvalg i cookies og localStorage
   - Konsistent språkopplevelse på tvers av økter

## Device Routing

Systemet ruter automatisk brukere til riktig grensesnitt ved hjelp av:

1. **Enhetsdeteksjon**
   - Sjekker user agent for mobile enheter
   - Sjekker skjermstørrelse og touch-støtte

2. **Brukerpreferanser**
   - Lagrer enhetspreferanser i cookies
   - Tillater manuell overstyring av autodeteksjon

3. **Smart Routing**
   - Automatisk omdirigering til riktig versjon
   - Fallback-visning hvis omdirigering tar for lang tid

## MFA-sikkerhetsbetraktninger

1. **TOTP-implementasjon**
   - Tidsbegrenset engangspassord med 30-sekunders gyldighet
   - QR-kode for enkel oppsett med autentikator-apper

2. **Gjenopprettingskoder**
   - Genererer sikre gjenopprettingskoder ved oppsett
   - Lagrer krypterte versjoner i databasen

3. **Enhetshåndtering**
   - Mulighet for å huske enheter for å redusere MFA-friksjon
   - Sikre cookies og lokale lagringsmekanismer

4. **Sikkerhetstiltak**
   - Rate limiting på MFA-forsøk
   - Logging av MFA-relaterte sikkerhetshendelser
   - Forebygging av bruteforce-angrep

## Utvidelsespunkter

MFA-systemet kan utvides med:

1. **Flere faktorer**
   - SMS-basert verifisering
   - Biometrisk autentisering (WebAuthn/FIDO2)
   - E-postbaserte engangspassord

2. **Flere språk**
   - Enkelt å legge til nye språk i oversettelsessystemet

3. **Utvidet enhetsgjenkjenning**
   - Enhetsfingerprinting for ytterligere sikkerhet
   - Mer detaljert enhetsanalyse for bedre brukeropplevelse

## Bruk

For å integrere MFA i en ny del av applikasjonen:

1. Importer nødvendige komponenter:
   ```tsx
   import MfaDeviceRouter from '@/components/MfaDeviceRouter';
   ```

2. Bruk routeren for å sikre riktig visning:
   ```tsx
   <MfaDeviceRouter
     mobileRoute="/mfa-mobile-path"
     desktopRoute="/mfa-desktop-path"
   />
   ```

3. For internasjonalisering, bruk oversettelsessystemet:
   ```tsx
   import { getMfaTranslator } from '@/lib/mfaTranslations';
   
   const t = getMfaTranslator(language);
   t('mfa.verification_title');
   ```

4. For custom MFA-implementasjoner, arv fra grunnkomponentene:
   ```tsx
   import MfaVerification from '@/components/MfaVerification';
   
   function CustomMfaVerification() {
     return <MfaVerification customProp={value} />;
   }
   ```