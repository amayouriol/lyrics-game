# Lyrics Game landing page

## Design reference

- Figma Make: [Design main page for game](https://www.figma.com/make/uKhaOrunrAtJ8Nd5iDnLsm/Design-main-page-for-game?t=lxRuDBPo2ifn0b47-1)
- Export received as `Design main page for game.zip`.

## Brand and visual direction

- Product name: **Lyrics Game**.
- Mood: energetic, analog-record-store, karaoke-night; near-black stage with violet neon accents.
- Background: `#08090D`; elevated black: `#111218`; primary text: `#F4F2F7`; secondary text: `#9998A5`.
- Game accent: violet `#9B7BFF`, with soft violet `#C3B5FF`; borders and grooves: `#292A31`.
- Spotify green (`#1ED760`) is reserved for the Spotify button and Spotify-specific feedback.
- Headings: **Archivo Black**. Body and controls: **DM Sans**.
- Texture: subtle grain overlay.

## Landing page structure

1. **Hero**
   - Lyrics Game wordmark in the upper left.
   - Headline: “Turn your playlist into karaoke.”
   - Supporting copy: “The song starts. The lyrics fade. Can you sing the missing words?”
   - Primary action: **Connect with Spotify***, which continues to the existing `/api/auth/login` route. The superscript marker points to the Spotify note directly beneath it.
   - Note: Spotify Premium is required for playback. The game uses playlists the player owns and Liked Songs, not playlists they follow.
   - Large rotating vinyl record on the right, with floating music notes and sound-wave accents.
   - Scroll cue links to the how-it-works section.
2. **How it works**
   - Dark purple gradient background with a bold, large typographic heading.
   - Dark card lays out the real flow: connect Spotify, choose a song, and fill in the missing words.
   - A second **Get started** action uses the same Spotify login route.
   - Footer includes a back-to-top link.

## Interaction and accessibility

- The existing logged-in home screen and authentication logic stay in place.
- The session-expired message remains visible on the public landing page.
- The record and music notes animate; reduced-motion settings turn those animations off.
- Decorative grain, record details, and music notes are hidden from screen readers. Links have visible keyboard focus styles, and the Spotify action is associated with its explanatory note.

## Product accuracy

The Figma Make prototype includes a live-room badge and a timed song-intro demo. Those elements imply multiplayer and gameplay modes that are not present in the current app, so the implementation uses the prototype's visual style but describes the actual Spotify playlist and missing-lyrics flow.
