# Glider 4.0 rules reference

Reference: John Calhoun's original sources, https://github.com/softdorothy/glider_4 , `Glider_405/Sources/G-PlayActive.p` and `G-Globals.p`.

The jazz-bar setting is level artwork, not permission to introduce new rules.

- `GetInput`, `holdKey`: left/right use `kMaxThrust = 5`; releasing both sets horizontal velocity to zero. Other original control modes exist; this implementation uses hold-key controls.
- `Coordinate`: runs once per two Macintosh ticks (30 Hz), starting lift at 2. `MoveGlider` adds 1 gravity. `Collision`, `liftIt`: sets lift to -7 (net -6 after gravity).
- Speeds here are converted to seconds and scaled from 512×342 to the existing 400×250 room coordinates.
- `PushIt` spends battery energy on horizontal speed. It is not a renewable vertical lift ability.
- No music-note collection or collection gate. Open exits accept the plane regardless of pickups.

These two custom rooms currently contain static furniture and vents, with no collectible objects. Score and battery remain zero. Original item types, moving hazards, save/settings menus and other house features are not implemented; do not claim full feature parity with Glider 4.0.

Paris vent reach was adjusted to clear the microphone and bar without manual upward thrust. That is a custom-room layout parameter, not a new player ability.

Verification: no-pickup exits in both directions; no-input descent; no manual lift; vent ascent; furniture collision; entire two-room flight using left/right and vents, no lost lives. Browser/mobile layout and touch checked separately.
