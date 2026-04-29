# Front Configurator

Lekki, samodzielny edytor wizualny w formie snippetu do konsoli przeglądarki.
Pozwala klikać elementy dowolnej strony i edytować ich tekst, kolor, font, padding, border-radius — bez instalacji, bez zależności, bez deployu.

Pomyślany jako sposób na to, żeby właściciel sklepu mógł pokazać swojej agencji **jak chce, żeby to wyglądało** — zamiast opisywać zmiany słowami.

## Jak uruchomić

1. Otwórz dowolną stronę w przeglądarce
2. `F12` → zakładka **Console**
3. Wklej zawartość `configurator.js` i naciśnij `Enter`
4. Klikaj elementy strony i edytuj je w panelu po prawej

## Skróty klawiszowe

| Skrót | Akcja |
|---|---|
| `Ctrl + Shift + E` | Toggle edit mode |
| `Esc` | Deselect |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |

## Funkcje

- Klikalna selekcja dowolnego elementu DOM
- Edycja tekstu, koloru, fontu, paddingu, border-radius
- Globalne tokeny designu (accent color, background, typografia)
- Pełna historia zmian — Undo / Redo
- Auto-save w sesji
- Inspector / Layers / History
- UI w Shadow DOM — nie koliduje ze stylami strony

## Bezpieczeństwo

100% lokalnie w przeglądarce. Skrypt:

- nie wysyła żadnych danych na zewnątrz
- nie skanuje strony
- nie wstrzykuje nic do oryginalnego DOM poza Shadow Rootem edytora
- nie korzysta z żadnych zewnętrznych zależności

Zmiany istnieją tylko w Twojej karcie i znikają po odświeżeniu strony.

## Usunięcie

```js
window.__FC_destroy()
```

## Status

Proof of concept — narzędzie towarzyszące koncepcji modułu **Front Configurator** dla Magento 2.

## Licencja

MIT
